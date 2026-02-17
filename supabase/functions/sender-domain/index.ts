import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const actionEndpoints: Record<string, string> = {
  add: "https://api.smtp2go.com/v3/domain/add",
  verify: "https://api.smtp2go.com/v3/domain/verify",
  view: "https://api.smtp2go.com/v3/domain/view",
  remove: "https://api.smtp2go.com/v3/domain/remove",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const smtpApiKey = Deno.env.get("SMTP2GO_API_KEY");
    if (!smtpApiKey) {
      return new Response(JSON.stringify({ error: "SMTP2GO is not configured on the server" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, domain } = await req.json();

    if (!action || !actionEndpoints[action]) {
      return new Response(JSON.stringify({ error: "Invalid action. Must be one of: add, verify, view, remove" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!domain) {
      return new Response(JSON.stringify({ error: "Missing domain" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for domain ownership checks (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Block domain registration for free users
    if (action === "add") {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .single();

      if (!profile || profile.plan === "free") {
        return new Response(JSON.stringify({ error: "Upgrade to Starter to use a custom domain" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check domain ownership on add/verify/view
    if (action === "add") {
      // Check if domain is already claimed by another user
      const { data: existing } = await supabaseAdmin
        .from("sender_domains")
        .select("user_id")
        .eq("domain", domain)
        .maybeSingle();

      if (existing && existing.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "This domain is already registered by another user" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Claim domain for this user if not yet claimed
      if (!existing) {
        await supabaseAdmin
          .from("sender_domains")
          .insert({ user_id: user.id, domain });
      }
    }

    if (action === "view" || action === "verify") {
      // Check if another user owns this domain
      const { data: existing } = await supabaseAdmin
        .from("sender_domains")
        .select("user_id")
        .eq("domain", domain)
        .maybeSingle();

      if (existing && existing.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Domain not registered for your account" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Auto-claim unclaimed domains (handles domains registered before sender_domains table)
      if (!existing) {
        await supabaseAdmin
          .from("sender_domains")
          .insert({ user_id: user.id, domain });
      }
    }

    const smtpResponse = await fetch(actionEndpoints[action], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: smtpApiKey,
        domain,
      }),
    });

    const smtpResult = await smtpResponse.json();

    // Log full response for debugging
    console.log(`sender-domain [${action}] ${domain}: status=${smtpResponse.status} keys=${Object.keys(smtpResult).join(",")}`, JSON.stringify(smtpResult).slice(0, 1000));

    return new Response(JSON.stringify(smtpResult), {
      status: smtpResponse.ok ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
