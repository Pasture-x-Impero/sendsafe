import { useState, useRef, useEffect, useCallback } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { useSenderDomain, useAddSenderDomain, useVerifySenderDomain } from "@/hooks/use-sender-domain";
import { toast } from "sonner";
import DOMPurify from "dompurify";

const tones = ["professional", "friendly", "direct"] as const;
const goals = ["sales", "partnerships", "recruiting", "other"] as const;

const toneKeys = {
  professional: "onboarding.tone.professional",
  friendly: "onboarding.tone.friendly",
  direct: "onboarding.tone.direct",
} as const;

const goalKeys = {
  sales: "onboarding.goal.sales",
  partnerships: "onboarding.goal.partnerships",
  recruiting: "onboarding.goal.recruiting",
  other: "onboarding.goal.other",
} as const;

const SettingsPage = () => {
  const { t } = useLanguage();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const [smtpSenderEmail, setSmtpSenderEmail] = useState<string | null>(null);
  const [smtpSenderName, setSmtpSenderName] = useState<string | null>(null);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [signatureHtml, setSignatureHtml] = useState<string | null>(null);
  const signatureRef = useRef<HTMLDivElement>(null);
  const signatureInitialized = useRef(false);

  // Initialize from profile on first load
  const senderEmail = smtpSenderEmail ?? profile?.smtp_sender_email ?? "";
  const senderName = smtpSenderName ?? profile?.smtp_sender_name ?? "";
  const currentSignature = signatureHtml ?? profile?.email_signature ?? "";

  // Set contentEditable innerHTML from profile on first load (avoids cursor-jump)
  useEffect(() => {
    if (profile?.email_signature && signatureRef.current && !signatureInitialized.current) {
      signatureRef.current.innerHTML = DOMPurify.sanitize(profile.email_signature);
      signatureInitialized.current = true;
    }
  }, [profile?.email_signature]);

  const handleSignatureInput = useCallback(() => {
    if (signatureRef.current) {
      setSignatureHtml(signatureRef.current.innerHTML);
    }
  }, []);

  const handleClearSignature = useCallback(() => {
    if (signatureRef.current) {
      signatureRef.current.innerHTML = "";
    }
    setSignatureHtml("");
  }, []);

  const addDomain = useAddSenderDomain();
  const verifyDomain = useVerifySenderDomain();
  const { data: domainInfo, isLoading: domainLoading } = useSenderDomain(profile?.smtp_sender_email);
  const [verifying, setVerifying] = useState(false);
  const [registering, setRegistering] = useState(false);

  const currentDomain = profile?.smtp_sender_email?.split("@")[1] ?? null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("settings.domain.copied"));
  };

  const handleRegisterDomain = async () => {
    if (!currentDomain) return;
    setRegistering(true);
    try {
      await addDomain.mutateAsync(currentDomain);
    } catch {
      toast.error("Failed to register domain");
    } finally {
      setRegistering(false);
    }
  };

  const handleSmtpSave = async () => {
    setSmtpSaving(true);
    try {
      const sanitizedSignature = currentSignature ? DOMPurify.sanitize(currentSignature) : null;
      await updateProfile.mutateAsync({
        smtp_sender_email: senderEmail || null,
        smtp_sender_name: senderName || null,
        email_signature: sanitizedSignature || null,
      });

      // Always try to register domain with SMTP2GO
      const newDomain = senderEmail?.split("@")[1];
      if (newDomain) {
        try {
          await addDomain.mutateAsync(newDomain);
        } catch (domainErr) {
          console.error("Domain registration failed:", domainErr);
          // Domain may already be registered - that's OK
        }
      }

      toast.success(t("settings.smtp.saved"));
    } catch {
      toast.error("Failed to save sender settings");
    } finally {
      setSmtpSaving(false);
    }
  };

  const handleVerifyDomain = async () => {
    if (!currentDomain) return;
    setVerifying(true);
    try {
      await verifyDomain.mutateAsync(currentDomain);
    } catch {
      toast.error("Failed to verify domain");
    } finally {
      setVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-bold text-foreground">{t("settings.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("settings.desc")}</p>
        </div>
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  const currentTone = profile?.tone ?? "professional";
  const currentGoal = profile?.goal ?? "sales";
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">{t("settings.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("settings.desc")}</p>
      </div>

      <div className="max-w-2xl space-y-8">
        {/* Sender Configuration */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-heading text-base font-semibold text-foreground">{t("settings.smtp.title")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("settings.smtp.desc")}</p>

          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("settings.smtp.senderEmail")}</label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSmtpSenderEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-accent/30 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="noreply@yourdomain.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("settings.smtp.senderName")}</label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSmtpSenderName(e.target.value)}
                className="w-full rounded-lg border border-border bg-accent/30 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Your Company"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("settings.signature.label")}</label>
              <p className="mb-2 text-xs text-muted-foreground">{t("settings.signature.desc")}</p>
              <div
                ref={signatureRef}
                contentEditable
                onInput={handleSignatureInput}
                data-placeholder={t("settings.signature.placeholder")}
                className="min-h-[80px] w-full rounded-lg border border-border bg-accent/30 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]"
              />
              {currentSignature && (
                <button
                  type="button"
                  onClick={handleClearSignature}
                  className="mt-1 text-xs text-muted-foreground underline hover:text-foreground"
                >
                  {t("settings.signature.clear")}
                </button>
              )}
            </div>

            <button
              onClick={handleSmtpSave}
              disabled={smtpSaving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {smtpSaving ? t("settings.smtp.saving") : t("settings.smtp.save")}
            </button>
          </div>

          {/* Domain Verification */}
          {profile?.smtp_sender_email && (
            <div className="mt-6 border-t border-border pt-6">
              <div className="flex items-center gap-3">
                <h4 className="text-sm font-semibold text-foreground">{t("settings.domain.title")}</h4>
                {domainInfo && (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      domainInfo.dkim_verified && domainInfo.rpath_verified
                        ? "bg-green-500/10 text-green-600"
                        : "bg-yellow-500/10 text-yellow-600"
                    }`}
                  >
                    {domainInfo.dkim_verified && domainInfo.rpath_verified
                      ? t("settings.domain.verified")
                      : t("settings.domain.pending")}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{t("settings.domain.desc")}</p>

              {domainLoading ? (
                <div className="mt-4 flex justify-center py-4">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : domainInfo ? (
                <div className="mt-4">
                  <p className="mb-3 text-sm font-medium text-foreground">{currentDomain}</p>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-border bg-accent/50">
                        <tr>
                          <th className="px-3 py-2 font-medium text-muted-foreground">{t("settings.domain.recordType")}</th>
                          <th className="px-3 py-2 font-medium text-muted-foreground">{t("settings.domain.host")}</th>
                          <th className="px-3 py-2 font-medium text-muted-foreground">{t("settings.domain.value")}</th>
                          <th className="px-3 py-2 font-medium text-muted-foreground">{t("settings.domain.status")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {/* DKIM record */}
                        <tr>
                          <td className="px-3 py-2 font-mono text-xs">CNAME</td>
                          <td className="px-3 py-2 font-mono text-xs break-all cursor-pointer hover:text-primary" onClick={() => copyToClipboard(domainInfo.dkim_selector)} title="Click to copy">{domainInfo.dkim_selector}</td>
                          <td className="px-3 py-2 font-mono text-xs break-all cursor-pointer hover:text-primary" onClick={() => copyToClipboard(domainInfo.dkim_value)} title="Click to copy">{domainInfo.dkim_value}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              domainInfo.dkim_verified ? "bg-green-500/10 text-green-600" : "bg-yellow-500/10 text-yellow-600"
                            }`}>
                              {domainInfo.dkim_verified ? t("settings.domain.verified") : t("settings.domain.pending")}
                            </span>
                          </td>
                        </tr>
                        {/* Return-path record */}
                        <tr>
                          <td className="px-3 py-2 font-mono text-xs">CNAME</td>
                          <td className="px-3 py-2 font-mono text-xs break-all cursor-pointer hover:text-primary" onClick={() => copyToClipboard(domainInfo.rpath_selector)} title="Click to copy">{domainInfo.rpath_selector}</td>
                          <td className="px-3 py-2 font-mono text-xs break-all cursor-pointer hover:text-primary" onClick={() => copyToClipboard("return.smtp2go.net")} title="Click to copy">return.smtp2go.net</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              domainInfo.rpath_verified ? "bg-green-500/10 text-green-600" : "bg-yellow-500/10 text-yellow-600"
                            }`}>
                              {domainInfo.rpath_verified ? t("settings.domain.verified") : t("settings.domain.pending")}
                            </span>
                          </td>
                        </tr>
                        {/* Tracker records */}
                        {domainInfo.trackers?.map((tracker, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 font-mono text-xs">CNAME</td>
                            <td className="px-3 py-2 font-mono text-xs break-all cursor-pointer hover:text-primary" onClick={() => copyToClipboard(tracker.subdomain)} title="Click to copy">{tracker.subdomain}</td>
                            <td className="px-3 py-2 font-mono text-xs break-all cursor-pointer hover:text-primary" onClick={() => copyToClipboard("track.smtp2go.net")} title="Click to copy">track.smtp2go.net</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                tracker.verification_status === "verified" ? "bg-green-500/10 text-green-600" : "bg-yellow-500/10 text-yellow-600"
                              }`}>
                                {tracker.verification_status === "verified" ? t("settings.domain.verified") : t("settings.domain.pending")}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Show verify button when not fully verified */}
                  {!(domainInfo.dkim_verified && domainInfo.rpath_verified) && (
                    <button
                      onClick={handleVerifyDomain}
                      disabled={verifying}
                      className="mt-4 rounded-lg border border-primary bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                    >
                      {verifying ? t("settings.domain.verifying") : t("settings.domain.verify")}
                    </button>
                  )}
                </div>
              ) : (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">{t("settings.domain.notRegistered")}</p>
                  <button
                    onClick={handleRegisterDomain}
                    disabled={registering}
                    className="mt-3 rounded-lg border border-primary bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                  >
                    {registering ? t("settings.domain.registering") : t("settings.domain.register")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tone */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-heading text-base font-semibold text-foreground">{t("settings.tone.title")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("settings.tone.desc")}</p>
          <div className="mt-4 flex gap-3">
            {tones.map((tone) => (
              <button
                key={tone}
                onClick={() => updateProfile.mutate({ tone })}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  currentTone === tone
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-accent text-foreground hover:border-primary/30"
                }`}
              >
                {t(toneKeys[tone])}
              </button>
            ))}
          </div>
        </div>

        {/* Email Preview */}
        {currentSignature && (
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-heading text-base font-semibold text-foreground">{t("settings.preview.title")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("settings.preview.desc")}</p>
            <div className="mt-4 rounded-lg border border-border bg-accent/20 p-4">
              <p className="whitespace-pre-line text-sm text-foreground">
                {t(`settings.preview.sampleBody.${currentTone}` as const).replace("{{name}}", "Sarah")}
              </p>
              <hr className="my-4 border-border" />
              <div
                className="text-sm text-foreground"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentSignature) }}
              />
            </div>
          </div>
        )}

        {/* Goal */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-heading text-base font-semibold text-foreground">{t("settings.goal.title")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("settings.goal.desc")}</p>
          <div className="mt-4 flex gap-3">
            {goals.map((goal) => (
              <button
                key={goal}
                onClick={() => updateProfile.mutate({ goal })}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  currentGoal === goal
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-accent text-foreground hover:border-primary/30"
                }`}
              >
                {t(goalKeys[goal])}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SettingsPage;
