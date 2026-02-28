import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const jwt = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("smtp_sender_email, smtp_sender_name, email_signature, font_family, plan")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipientEmail = user.email;
    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: "Could not determine your email address" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For signature tests we always send from our own domain — the user just
    // needs to see how the signature looks, not validate their sender domain.
    const senderEmail = "noreply@pasture.cloud";
    const senderName = "SendSafe";

    const fontFamily = profile.font_family || "Arial";
    const bodyContent = "<p>Hei! Dette er en test for å se hvordan signaturen din ser ut i en ekte e-post.</p>";

    let signatureHtml = "";
    if (profile.email_signature) {
      signatureHtml = "<br><br>" + profile.email_signature;
    }

    const htmlBody = `<div style="font-family:${fontFamily},sans-serif;">${bodyContent}${signatureHtml}</div>`;
    const textBody = "Hei! Dette er en test for å se hvordan signaturen din ser ut i en ekte e-post.";

    const smtpResponse = await fetch("https://api.smtp2go.com/v3/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: smtpApiKey,
        to: [recipientEmail],
        sender: `${senderName} <${senderEmail}>`,
        subject: "Signaturtest – SendSafe",
        html_body: htmlBody,
        text_body: textBody,
      }),
    });

    const smtpResult = await smtpResponse.json();

    if (!smtpResponse.ok || smtpResult.data?.error) {
      const smtpError = smtpResult.data?.error || smtpResult.data?.failures?.[0] || "SMTP2GO error";
      return new Response(JSON.stringify({ error: typeof smtpError === "string" ? smtpError : JSON.stringify(smtpError) }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
