import { useState, useRef, useEffect, useCallback, type ClipboardEvent } from "react";
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

  const [senderLocalPart, setSenderLocalPart] = useState<string | null>(null);
  const [smtpSenderName, setSmtpSenderName] = useState<string | null>(null);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [signatureHtml, setSignatureHtml] = useState<string | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const signatureRef = useRef<HTMLDivElement>(null);
  const signatureInitialized = useRef(false);

  // Derive local part and domain from profile
  const profileLocalPart = profile?.smtp_sender_email?.split("@")[0] ?? "";
  const currentLocalPart = senderLocalPart ?? profileLocalPart;
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

  // Clean up Outlook / Word HTML on paste
  const cleanOutlookHtml = useCallback((html: string) => {
    let clean = html;
    // Remove Office XML tags (<o:p>, <v:*, <w:*, etc.)
    clean = clean.replace(/<\/?[ovw]:[^>]*>/gi, "");
    // Remove mso-* styles
    clean = clean.replace(/mso-[^;:"']+:[^;:"']+;?/gi, "");
    // Remove class="Mso*"
    clean = clean.replace(/class="Mso[^"]*"/gi, "");
    // Remove empty style attributes
    clean = clean.replace(/\s*style="\s*"/gi, "");
    // Remove XML declarations and conditional comments
    clean = clean.replace(/<!\[if[^>]*>[\s\S]*?<!\[endif\]>/gi, "");
    clean = clean.replace(/<!--\[if[^>]*>[\s\S]*?<!\[endif\]-->/gi, "");
    // Remove <xml>...</xml> blocks
    clean = clean.replace(/<xml>[\s\S]*?<\/xml>/gi, "");
    // Remove font-family declarations (often Calibri/Times New Roman from Office)
    clean = clean.replace(/font-family:[^;}"']+;?/gi, "");
    // Remove empty spans
    clean = clean.replace(/<span[^>]*>\s*<\/span>/gi, "");
    return DOMPurify.sanitize(clean);
  }, []);

  const handleSignaturePaste = useCallback((e: ClipboardEvent<HTMLDivElement>) => {
    const html = e.clipboardData.getData("text/html");
    if (html) {
      e.preventDefault();
      const cleaned = cleanOutlookHtml(html);
      document.execCommand("insertHTML", false, cleaned);
      if (signatureRef.current) {
        setSignatureHtml(signatureRef.current.innerHTML);
      }
    }
  }, [cleanOutlookHtml]);

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
      const fullEmail = currentLocalPart && currentDomain ? `${currentLocalPart}@${currentDomain}` : null;
      const sanitizedSignature = currentSignature ? DOMPurify.sanitize(currentSignature) : null;
      await updateProfile.mutateAsync({
        smtp_sender_email: fullEmail,
        smtp_sender_name: senderName || null,
        email_signature: sanitizedSignature || null,
      });

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

        {/* Domain Verification */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <h3 className="font-heading text-base font-semibold text-foreground">{t("settings.domain.title")}</h3>
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

          {/* Domain input + register */}
          <div className="mt-4 flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("settings.domain.domainLabel")}</label>
              <input
                type="text"
                value={domainInput || currentDomain || ""}
                onChange={(e) => setDomainInput(e.target.value)}
                className="w-full rounded-lg border border-border bg-accent/30 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="yourdomain.com"
              />
            </div>
            <button
              onClick={async () => {
                const d = domainInput || currentDomain;
                if (!d) return;
                setRegistering(true);
                try {
                  await addDomain.mutateAsync(d);
                  // Also save as sender email if no email set yet
                  if (!profile?.smtp_sender_email) {
                    await updateProfile.mutateAsync({ smtp_sender_email: `noreply@${d}` });
                  }
                  setDomainInput("");
                } catch {
                  toast.error("Failed to register domain");
                } finally {
                  setRegistering(false);
                }
              }}
              disabled={registering || !(domainInput || currentDomain)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {registering ? t("settings.domain.registering") : t("settings.domain.register")}
            </button>
          </div>

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
          ) : currentDomain ? (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">{t("settings.domain.notRegistered")}</p>
            </div>
          ) : null}
        </div>

        {/* Sender Configuration */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-heading text-base font-semibold text-foreground">{t("settings.smtp.title")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("settings.smtp.desc")}</p>

          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("settings.smtp.senderEmail")}</label>
              <div className="flex items-center gap-0">
                <input
                  type="text"
                  value={currentLocalPart}
                  onChange={(e) => setSenderLocalPart(e.target.value)}
                  className="flex-1 rounded-l-lg border border-r-0 border-border bg-accent/30 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="noreply"
                />
                <span className="rounded-r-lg border border-border bg-accent/50 px-3 py-2 text-sm text-muted-foreground">
                  @{currentDomain || t("settings.domain.noDomain")}
                </span>
              </div>
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
                onPaste={handleSignaturePaste}
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
              disabled={smtpSaving || !currentDomain}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {smtpSaving ? t("settings.smtp.saving") : t("settings.smtp.save")}
            </button>
          </div>
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


      </div>
    </div>
  );
};

export default SettingsPage;
