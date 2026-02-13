import { useLanguage } from "@/i18n/LanguageContext";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";

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
