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

    const { email_id, test_email } = await req.json();
    if (!email_id) {
      return new Response(JSON.stringify({ error: "Missing email_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch email record
    const { data: email, error: emailError } = await supabase
      .from("emails")
      .select("*")
      .eq("id", email_id)
      .eq("user_id", user.id)
      .single();

    if (emailError || !email) {
      return new Response(JSON.stringify({ error: "Email not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (email.status !== "approved" && !test_email) {
      return new Response(JSON.stringify({ error: "Email must be approved before sending" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user's sender settings from profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("smtp_sender_email, smtp_sender_name, email_signature")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profile.smtp_sender_email) {
      return new Response(JSON.stringify({ error: "Sender email not configured. Set your sender email in Settings." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipient = test_email || email.contact_email;
    const senderName = profile.smtp_sender_name || "SendSafe";

    // Build email body, appending signature if present
    let htmlBody = email.body.replace(/\n/g, "<br>");
    let textBody = email.body;

    if (profile.email_signature) {
      htmlBody += "<br><br><hr>" + profile.email_signature;
      // Strip HTML tags for plain-text version of signature
      const textSignature = profile.email_signature.replace(/<[^>]*>/g, "");
      textBody += "\n\n---\n" + textSignature;
    }

    // Call SMTP2GO API
    const smtpResponse = await fetch("https://api.smtp2go.com/v3/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: smtpApiKey,
        to: [`${email.contact_name} <${recipient}>`],
        sender: `${senderName} <${profile.smtp_sender_email}>`,
        subject: email.subject,
        html_body: htmlBody,
        text_body: textBody,
      }),
    });

    const smtpResult = await smtpResponse.json();

    if (!smtpResponse.ok || smtpResult.data?.error) {
      return new Response(JSON.stringify({ error: "SMTP2GO error", details: smtpResult }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If this was a real send (not test), mark email as sent
    if (!test_email) {
      await supabase
        .from("emails")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", email_id);
    }

    return new Response(
      JSON.stringify({ success: true, test: !!test_email }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
