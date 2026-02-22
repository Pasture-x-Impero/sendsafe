import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_AI_LIMITS: Record<string, number> = { free: 0, starter: 100, pro: 500 };

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return err("OpenAI API key not configured", 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return err("Missing authorization", 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return err("Unauthorized", 401);

    const { contact_ids, campaign_name, campaign_id, template_subject, template_body, tone, goal } =
      await req.json();

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
      const systemPrompt = [
        `You are a ${tone || "professional"} email copywriter for a ${goal || "sales"} outreach campaign named "${campaign_name}".`,
        `You are writing to: ${contact.contact_name || "the recipient"} at ${contact.company}${contact.industry ? ` (industry: ${contact.industry})` : ""}.`,
        `Fill in every section marked with [...] in the email template. The text you write inside [...] should be natural, concise, and relevant to this specific recipient.`,
        `Text outside [...] must remain EXACTLY as written — do not modify it.`,
        `Return ONLY valid JSON with "subject" and "body" string fields. No markdown, no explanation.`,
      ].join(" ");

      const userPrompt =
        `Fill in the [...] sections for the recipient above.\n\n` +
        `Subject: ${template_subject}\n\n` +
        `Body:\n${template_body}\n\n` +
        `Return ONLY: {"subject": "...", "body": "..."}`;

      let subject = template_subject;
      let body = template_body;

      try {
        const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 1000,
          }),
        });

        const aiResult = await aiResponse.json();
        const content = aiResult.choices?.[0]?.message?.content?.trim() ?? "";

        let parsed: { subject?: string; body?: string } = {};
        try {
          parsed = JSON.parse(content);
        } catch {
          const match = content.match(/\{[\s\S]*\}/);
          if (match) parsed = JSON.parse(match[0]);
        }

        if (parsed.subject) subject = parsed.subject;
        if (parsed.body) body = parsed.body;
      } catch {
        // Fallback: keep template as-is for this contact
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
        issues: [],
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
