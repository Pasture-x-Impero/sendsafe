import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PLAN_AI_LIMITS: Record<string, number> = {
  free: 0,
  starter: 100,
  pro: 500,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const openaiKey = Deno.env.get("GROQ_API_KEY");
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "Groq API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { contact_ids } = await req.json();
    if (!contact_ids || !Array.isArray(contact_ids) || contact_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing contact_ids" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch profile & check plan
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single();

    const plan = profile?.plan ?? "free";
    const aiLimit = PLAN_AI_LIMITS[plan] ?? 0;

    // Count AI usage this month (emails + enrichments)
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    ).toISOString();

    const { count: aiEmailsUsed } = await supabase
      .from("emails")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("generation_mode", "ai")
      .gte("created_at", startOfMonth);

    const { count: enrichmentsUsed } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .not("enriched_at", "is", null)
      .gte("enriched_at", startOfMonth);

    const totalUsed = (aiEmailsUsed ?? 0) + (enrichmentsUsed ?? 0);
    const remaining = aiLimit - totalUsed;

    if (contact_ids.length > remaining) {
      return new Response(
        JSON.stringify({
          error:
            remaining <= 0
              ? "Monthly AI credit limit reached. Upgrade your plan."
              : `Only ${remaining} AI credits remaining. Select fewer contacts.`,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch contacts
    const { data: contacts, error: contactsError } = await supabase
      .from("leads")
      .select("*")
      .in("id", contact_ids)
      .eq("user_id", user.id);

    if (contactsError || !contacts) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch contacts" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: {
      id: string;
      contact_name: string | null;
      contact_email: string | null;
      domain: string | null;
      success: boolean;
    }[] = [];

    for (const contact of contacts) {
      try {
        const prompt = `Find the CEO or managing director of the company "${contact.company}"${contact.domain ? ` (website: ${contact.domain})` : ""}.

Return ONLY a JSON object with these fields:
- "name": full name (string or null)
- "email": most likely business email (string or null)
- "domain": company website domain without https:// (string or null)

If the domain is known, generate the email using common formats like firstname@domain or firstname.lastname@domain.
Respond with ONLY valid JSON, no markdown or explanation.`;

        const aiResponse = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openaiKey}`,
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [
                {
                  role: "system",
                  content:
                    "You are a business data research assistant. You find CEO/managing director contact information for companies. Return only valid JSON.",
                },
                { role: "user", content: prompt },
              ],
              temperature: 0.1,
              max_tokens: 200,
            }),
          }
        );

        const aiResult = await aiResponse.json();
        const content = aiResult.choices?.[0]?.message?.content?.trim();

        let parsed: {
          name: string | null;
          email: string | null;
          domain: string | null;
        } = { name: null, email: null, domain: null };

        try {
          parsed = JSON.parse(content);
        } catch {
          const jsonMatch = content?.match(/\{[\s\S]*\}/);
          if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
        }

        // Build update — only fill in missing fields
        const updates: Record<string, unknown> = {
          enriched_at: new Date().toISOString(),
        };
        if (parsed.name && !contact.contact_name)
          updates.contact_name = parsed.name;
        if (parsed.email && !contact.contact_email)
          updates.contact_email = parsed.email;
        if (parsed.domain && !contact.domain) updates.domain = parsed.domain;

        await supabase.from("leads").update(updates).eq("id", contact.id);

        results.push({
          id: contact.id,
          contact_name: parsed.name,
          contact_email: parsed.email,
          domain: parsed.domain,
          success: true,
        });
      } catch {
        results.push({
          id: contact.id,
          contact_name: null,
          contact_email: null,
          domain: null,
          success: false,
        });
      }
    }

    return new Response(
      JSON.stringify({ results, credits_used: contacts.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
