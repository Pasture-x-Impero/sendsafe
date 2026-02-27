import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_AI_LIMITS: Record<string, number> = { free: 0, starter: 100, pro: 500 };

const LANGUAGE_NAMES: Record<string, string> = {
  no: "Norwegian",
  en: "English",
  sv: "Swedish",
  da: "Danish",
};

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface ContactContext {
  contactName: string;
  company: string;
  industry: string;
  campaignName: string;
  tone: string;
  goal: string;
  language: string;
}

// Fill a single [...] slot by asking AI only about that slot.
// Text outside the slot is never sent to AI and can never be changed.
async function fillSlot(
  instruction: string,
  context: ContactContext,
  groqKey: string
): Promise<string> {
  const writingLanguage = LANGUAGE_NAMES[context.language] ?? "Norwegian";

  const prompt =
    `You are writing a ${context.tone} ${context.goal} outreach email in ${writingLanguage} ` +
    `to ${context.contactName} at ${context.company}` +
    (context.industry ? ` (industry: ${context.industry})` : "") +
    ` for campaign "${context.campaignName}".\n\n` +
    `Complete this instruction: "${instruction}"\n\n` +
    `Return ONLY the replacement text — no brackets, no quotes, no extra explanation.`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 300,
    }),
  });

  const result = await response.json();
  return result.choices?.[0]?.message?.content?.trim() ?? instruction;
}

// Substitute {field} variables from contact data before AI processing.
// Unknown variables are left as-is. Missing values become empty string and are tracked.
function substituteFields(
  template: string,
  contact: Record<string, unknown>
): { result: string; missing: string[] } {
  const map: Record<string, string | null> = {
    contact_name: contact.contact_name as string | null,
    company: contact.company as string | null,
    domene: contact.domain as string | null,
    industry: contact.industry as string | null,
    contact_email: contact.contact_email as string | null,
  };
  const missing: string[] = [];
  const result = template.replace(/\{(\w+)\}/g, (match, key) => {
    if (!(key in map)) return match; // Unknown variable — leave as-is
    if (!map[key]) { missing.push(key); return ""; }
    return map[key]!;
  });
  return { result, missing };
}

// Replace every [...] slot in a template string.
// Only slot contents are sent to AI; surrounding text is untouched.
async function processTemplate(
  template: string,
  context: ContactContext,
  groqKey: string
): Promise<string> {
  const regex = /\[([^\]]+)\]/g;
  const matches: Array<{ index: number; full: string; instruction: string }> = [];
  let match;

  while ((match = regex.exec(template)) !== null) {
    matches.push({ index: match.index, full: match[0], instruction: match[1] });
  }

  if (matches.length === 0) return template; // No slots — return exactly as written

  // Fill each unique instruction once (cache to avoid duplicate API calls)
  const cache = new Map<string, string>();
  for (const { instruction } of matches) {
    if (!cache.has(instruction)) {
      const replacement = await fillSlot(instruction, context, groqKey);
      cache.set(instruction, replacement);
    }
  }

  // Replace slots from right to left to preserve string indices
  let result = template;
  for (let i = matches.length - 1; i >= 0; i--) {
    const { index, full, instruction } = matches[i];
    const replacement = cache.get(instruction) ?? instruction;
    result = result.slice(0, index) + replacement + result.slice(index + full.length);
  }

  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) return err("Groq API key not configured", 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return err("Missing authorization", 401);

    const jwt = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) return err("Unauthorized", 401);

    const {
      contact_ids,
      campaign_name,
      campaign_id,
      template_subject,
      template_body,
      tone,
      goal,
      language,
    } = await req.json();

    if (!contact_ids?.length || !template_subject || !template_body || !campaign_name) {
      return err("Missing required fields");
    }

    // Check AI credit limit
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single();

    const plan = profile?.plan ?? "free";
    const aiLimit = PLAN_AI_LIMITS[plan] ?? 0;

    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    ).toISOString();

    const { count: aiEmailsUsed } = await supabase
      .from("emails")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("generation_mode", ["ai", "hybrid"])
      .gte("created_at", startOfMonth);

    const { count: enrichmentsUsed } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .not("enriched_at", "is", null)
      .gte("enriched_at", startOfMonth);

    const remaining = aiLimit - ((aiEmailsUsed ?? 0) + (enrichmentsUsed ?? 0));

    if (contact_ids.length > remaining) {
      return err(
        remaining <= 0
          ? "Monthly AI credit limit reached. Upgrade your plan for more AI credits."
          : `Only ${remaining} AI credits remaining this month. Select fewer contacts or upgrade your plan.`,
        403
      );
    }

    // Fetch contacts
    const { data: contacts, error: contactsError } = await supabase
      .from("leads")
      .select("*")
      .in("id", contact_ids)
      .eq("user_id", user.id);

    if (contactsError || !contacts) return err("Failed to fetch contacts", 500);

    // Generate one email per contact
    const emailRows = [];

    for (const contact of contacts) {
      const context: ContactContext = {
        contactName: contact.contact_name || "the recipient",
        company: contact.company,
        industry: contact.industry ?? "",
        campaignName: campaign_name,
        tone: tone || "professional",
        goal: goal || "sales",
        language: language || "no",
      };

      const { result: subjectWithFields, missing: subjectMissing } = substituteFields(template_subject, contact);
      const { result: bodyWithFields, missing: bodyMissing } = substituteFields(template_body, contact);
      const allMissing = [...new Set([...subjectMissing, ...bodyMissing])];

      let subject = subjectWithFields;
      let body = bodyWithFields;

      try {
        subject = await processTemplate(subjectWithFields, context, groqKey);
        body = await processTemplate(bodyWithFields, context, groqKey);
      } catch {
        // Fallback: keep field-substituted template as-is for this contact
      }

      emailRows.push({
        user_id: user.id,
        lead_id: contact.id,
        company: contact.company,
        contact_name: contact.contact_name || "",
        contact_email: contact.contact_email,
        subject,
        body,
        confidence: 0,
        status: "draft",
        approved: false,
        issues: allMissing.map((f) => `MISSING_FIELD:${f}`),
        suggestions: null,
        campaign_id,
        campaign_name,
        generation_mode: "hybrid",
      });
    }

    const { data: inserted, error: insertError } = await supabase
      .from("emails")
      .insert(emailRows)
      .select();

    if (insertError) throw insertError;

    return ok({ emails: inserted });
  } catch (e) {
    return err((e as Error).message, 500);
  }
});
