import { useState, useRef, useEffect, useCallback, type ClipboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/i18n/LanguageContext";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSenderDomain, useAddSenderDomain, useVerifySenderDomain } from "@/hooks/use-sender-domain";
import { toast } from "sonner";
import DOMPurify from "dompurify";

const SIGNATURE_PURIFY_CONFIG = {
  ADD_ATTR: ["target", "cellpadding", "cellspacing", "border", "align", "valign", "bgcolor"],
  ADD_DATA_URI_TAGS: ["img"] as string[],
};

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

const PLAN_SEND_LIMITS: Record<string, number> = { free: 10, starter: 300, pro: 1000 };
const PLAN_AI_LIMITS: Record<string, number> = { free: 0, starter: 100, pro: 500 };
const PLAN_PRICES: Record<string, string> = { free: "0 kr", starter: "299 kr", pro: "799 kr" };

const SettingsPage = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  // Usage queries
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const plan = profile?.plan ?? "free";

  const { data: sendsUsed = 0 } = useQuery({
    queryKey: ["usage-sends", user?.id, startOfMonth],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("emails")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "sent")
        .gte("sent_at", startOfMonth);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: aiUsed = 0 } = useQuery({
    queryKey: ["usage-ai", user?.id, startOfMonth],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("emails")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("generation_mode", "ai")
        .gte("created_at", startOfMonth);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const [senderLocalPart, setSenderLocalPart] = useState<string | null>(null);
  const [smtpSenderName, setSmtpSenderName] = useState<string | null>(null);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [signatureHtml, setSignatureHtml] = useState<string | null>(null);
  const [domainInput, setDomainInput] = useState<string | null>(null);
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
      signatureRef.current.innerHTML = DOMPurify.sanitize(profile.email_signature, SIGNATURE_PURIFY_CONFIG);
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
    // Unwrap <!--[if !vml]--> blocks — these contain HTML fallback images we want to keep
    clean = clean.replace(/<!--\[if !vml\]-->([\s\S]*?)<!--\[endif\]-->/gi, "$1");
    // Remove remaining conditional comments (VML blocks, etc.) and their content
    clean = clean.replace(/<!\[if[^>]*>[\s\S]*?<!\[endif\]>/gi, "");
    clean = clean.replace(/<!--\[if[^>]*>[\s\S]*?<!\[endif\]-->/gi, "");
    // Remove Office XML tags (<o:p>, <v:*, <w:*, etc.) but keep <img>
    clean = clean.replace(/<\/?[ovw]:[^>]*>/gi, "");
    // Remove <xml>...</xml> blocks
    clean = clean.replace(/<xml>[\s\S]*?<\/xml>/gi, "");
    // Remove mso-* styles
    clean = clean.replace(/mso-[^;:"']+:[^;:"']+;?/gi, "");
    // Remove class="Mso*"
    clean = clean.replace(/class="Mso[^"]*"/gi, "");
    // Remove empty style attributes
    clean = clean.replace(/\s*style="\s*"/gi, "");
    // Remove font-family declarations (often Calibri/Times New Roman from Office)
    clean = clean.replace(/font-family:[^;}"']+;?/gi, "");
    // Remove empty spans
    clean = clean.replace(/<span[^>]*>\s*<\/span>/gi, "");
    return DOMPurify.sanitize(clean, SIGNATURE_PURIFY_CONFIG);
  }, []);

  const handleSignaturePaste = useCallback((e: ClipboardEvent<HTMLDivElement>) => {
    const html = e.clipboardData.getData("text/html");
    if (html) {
      e.preventDefault();
      const cleaned = cleanOutlookHtml(html);
      if (signatureRef.current) {
        signatureRef.current.innerHTML = cleaned;
        setSignatureHtml(cleaned);
      }
    }
  }, [cleanOutlookHtml]);

  const addDomain = useAddSenderDomain();
  const verifyDomain = useVerifySenderDomain();
  const { data: domainInfo, isLoading: domainLoading } = useSenderDomain(profile?.plan === "free" ? null : profile?.smtp_sender_email);
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
      const localPart = plan === "free" ? (senderLocalPart ?? "noreply") : currentLocalPart;
      const domain = plan === "free" ? "pasture.cloud" : currentDomain;
      const fullEmail = localPart && domain ? `${localPart}@${domain}` : null;
      const sanitizedSignature = currentSignature ? DOMPurify.sanitize(currentSignature, SIGNATURE_PURIFY_CONFIG) : null;
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
        {/* Plans & Usage */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading text-base font-semibold text-foreground">{t("settings.plan.title")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t("settings.plan.desc")}</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              {t(`plan.${plan}` as "plan.free")} — {PLAN_PRICES[plan]}
              {plan !== "free" && <span className="ml-1 text-xs font-normal text-muted-foreground">{t("pricing.period")}</span>}
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {/* Sends usage */}
            <div className="rounded-lg border border-border bg-accent/20 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{t("settings.plan.sends")}</span>
                <span className="text-muted-foreground">{sendsUsed} / {PLAN_SEND_LIMITS[plan]}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-accent">
                <div
                  className={`h-full rounded-full transition-all ${
                    sendsUsed >= PLAN_SEND_LIMITS[plan] ? "bg-destructive" : "bg-primary"
                  }`}
                  style={{ width: `${Math.min(100, (sendsUsed / PLAN_SEND_LIMITS[plan]) * 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {Math.max(0, PLAN_SEND_LIMITS[plan] - sendsUsed)} {t("plan.sendsRemaining")}
              </p>
            </div>

            {/* AI credits usage */}
            <div className="rounded-lg border border-border bg-accent/20 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{t("settings.plan.aiCredits")}</span>
                <span className="text-muted-foreground">
                  {plan === "free" ? "—" : `${aiUsed} / ${PLAN_AI_LIMITS[plan]}`}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-accent">
                {plan !== "free" && (
                  <div
                    className={`h-full rounded-full transition-all ${
                      aiUsed >= PLAN_AI_LIMITS[plan] ? "bg-destructive" : "bg-primary"
                    }`}
                    style={{ width: `${Math.min(100, (aiUsed / PLAN_AI_LIMITS[plan]) * 100)}%` }}
                  />
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {plan === "free"
                  ? t("plan.aiDisabled")
                  : `${Math.max(0, PLAN_AI_LIMITS[plan] - aiUsed)} ${t("plan.aiCreditsRemaining")}`
                }
              </p>
            </div>
          </div>

          {/* Plan picker */}
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {(["free", "starter", "pro"] as const).map((tier) => {
              const isCurrent = plan === tier;
              return (
                <div
                  key={tier}
                  className={`relative rounded-lg border p-4 ${
                    isCurrent
                      ? "border-primary bg-primary/5"
                      : "border-border bg-accent/20"
                  }`}
                >
                  {tier === "starter" && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                      {t("pricing.mostPopular")}
                    </span>
                  )}
                  <p className="font-heading text-sm font-semibold text-foreground">{t(`plan.${tier}` as "plan.free")}</p>
                  <p className="mt-0.5 text-lg font-bold text-foreground">
                    {PLAN_PRICES[tier]}
                    {tier !== "free" && <span className="text-xs font-normal text-muted-foreground"> {t("pricing.period")}</span>}
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <li>{PLAN_SEND_LIMITS[tier]} {t("settings.plan.sends").toLowerCase()} {t("pricing.period")}</li>
                    <li>{PLAN_AI_LIMITS[tier] === 0 ? "—" : `${PLAN_AI_LIMITS[tier]} ${t("settings.plan.aiCredits").toLowerCase()}`}</li>
                    <li>{tier === "free" ? t("pricing.feature.standardOnly") : t("pricing.feature.customDomain")}</li>
                  </ul>
                  {isCurrent ? (
                    <span className="mt-3 block text-center text-xs font-medium text-primary">{t("settings.plan.current")}</span>
                  ) : (
                    <button
                      onClick={() => updateProfile.mutate({ plan: tier }, {
                        onSuccess: () => toast.success(t("settings.plan.upgraded")),
                        onError: (err) => toast.error(err.message),
                      })}
                      className={`mt-3 w-full rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        tier === "free"
                          ? "border border-border bg-accent text-foreground hover:bg-accent/80"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }`}
                    >
                      {tier === "free" ? t("settings.plan.downgrade") : t("settings.plan.upgrade")}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

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

        {/* Domain Verification — only for Starter/Pro */}
        {plan !== "free" && (
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
                value={domainInput ?? currentDomain ?? ""}
                onChange={(e) => setDomainInput(e.target.value)}
                className="w-full rounded-lg border border-border bg-accent/30 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="yourdomain.com"
              />
            </div>
            <button
              onClick={async () => {
                const d = domainInput?.trim() || currentDomain;
                if (!d) return;
                setRegistering(true);
                try {
                  try {
                    await addDomain.mutateAsync(d);
                  } catch (addErr: unknown) {
                    // 409 = domain taken by another user
                    const msg = addErr instanceof Error ? addErr.message : "";
                    if (msg.includes("already registered")) {
                      toast.error(t("settings.domain.taken"));
                      return;
                    }
                    // Other errors (e.g. already registered by same user in SMTP2GO) — continue
                  }
                  // Update sender email to use the domain (keep local part or default to "noreply")
                  const local = currentLocalPart || "noreply";
                  await updateProfile.mutateAsync({ smtp_sender_email: `${local}@${d}` });
                  setDomainInput(null);
                  setSenderLocalPart(null);
                  toast.success(t("settings.domain.registered"));
                } catch {
                  toast.error("Failed to register domain");
                } finally {
                  setRegistering(false);
                }
              }}
              disabled={registering || !(domainInput?.trim() || currentDomain)}
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
        )}

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
                  value={plan === "free" ? (senderLocalPart ?? "noreply") : currentLocalPart}
                  onChange={(e) => setSenderLocalPart(e.target.value)}
                  className="flex-1 rounded-l-lg border border-r-0 border-border bg-accent/30 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="noreply"
                />
                <span className="rounded-r-lg border border-border bg-accent/50 px-3 py-2 text-sm text-muted-foreground">
                  @{plan === "free" ? "pasture.cloud" : (currentDomain || t("settings.domain.noDomain"))}
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
              {plan === "free" && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("settings.signature.freeNotice")}
                </p>
              )}
            </div>

            <button
              onClick={handleSmtpSave}
              disabled={smtpSaving || (plan !== "free" && !currentDomain)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {smtpSaving ? t("settings.smtp.saving") : t("settings.smtp.save")}
            </button>
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
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentSignature, SIGNATURE_PURIFY_CONFIG) }}
              />
              {plan === "free" && (
                <>
                  <hr className="my-4 border-border" />
                  <p className="text-xs text-muted-foreground">
                    Want to know how this email was sent? Check out: <a href="https://sendsafe.pasture.zone" target="_blank" rel="noopener noreferrer" className="text-primary underline">sendsafe.pasture.zone</a>
                  </p>
                </>
              )}
            </div>
          </div>
        )}

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

      </div>
    </div>
  );
};

export default SettingsPage;
