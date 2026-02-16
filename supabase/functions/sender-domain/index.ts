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

    const smtpResponse = await fetch(actionEndpoints[action], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: smtpApiKey,
        domain,
      }),
    });

    const smtpResult = await smtpResponse.json();

    // Log for debugging
    console.log(`sender-domain [${action}] ${domain}: status=${smtpResponse.status}`, JSON.stringify(smtpResult));

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
