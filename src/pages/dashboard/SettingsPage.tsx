import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { toast } from "sonner";

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

  const [smtpApiKey, setSmtpApiKey] = useState<string | null>(null);
  const [smtpSenderEmail, setSmtpSenderEmail] = useState<string | null>(null);
  const [smtpSenderName, setSmtpSenderName] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [smtpSaving, setSmtpSaving] = useState(false);

  // Initialize SMTP fields from profile on first load
  const apiKey = smtpApiKey ?? profile?.smtp_api_key ?? "";
  const senderEmail = smtpSenderEmail ?? profile?.smtp_sender_email ?? "";
  const senderName = smtpSenderName ?? profile?.smtp_sender_name ?? "";

  const handleSmtpSave = async () => {
    setSmtpSaving(true);
    try {
      await updateProfile.mutateAsync({
        smtp_api_key: apiKey || null,
        smtp_sender_email: senderEmail || null,
        smtp_sender_name: senderName || null,
      });
      toast.success(t("settings.smtp.saved"));
    } catch {
      toast.error("Failed to save SMTP settings");
    } finally {
      setSmtpSaving(false);
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
  const currentThreshold = profile?.autosend_threshold ?? 90;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">{t("settings.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("settings.desc")}</p>
      </div>

      <div className="max-w-2xl space-y-8">
        {/* SMTP Configuration */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-heading text-base font-semibold text-foreground">{t("settings.smtp.title")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("settings.smtp.desc")}</p>

          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("settings.smtp.apiKey")}</label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setSmtpApiKey(e.target.value)}
                  className="w-full rounded-lg border border-border bg-accent/30 px-3 py-2 pr-16 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="api-xxxxxxxxxxxxxxxxxxxxxxxx"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

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

            <button
              onClick={handleSmtpSave}
              disabled={smtpSaving}
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

        {/* Auto-send threshold */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-heading text-base font-semibold text-foreground">{t("settings.autosend.title")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("settings.autosend.desc")}</p>
          <div className="mt-4 flex items-center gap-4">
            <input
              type="range"
              min={50}
              max={100}
              value={currentThreshold}
              onChange={(e) => updateProfile.mutate({ autosend_threshold: Number(e.target.value) })}
              className="h-2 w-64 cursor-pointer appearance-none rounded-full bg-border accent-primary"
            />
            <span className="font-heading text-lg font-bold text-foreground">{currentThreshold}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
