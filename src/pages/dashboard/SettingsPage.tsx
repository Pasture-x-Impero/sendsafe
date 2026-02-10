import { useLanguage } from "@/i18n/LanguageContext";

const SettingsPage = () => {
  const { t } = useLanguage();

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
            {[t("onboarding.tone.professional"), t("onboarding.tone.friendly"), t("onboarding.tone.direct")].map((tone) => (
              <button
                key={tone}
                className="rounded-lg border border-border bg-accent px-4 py-2 text-sm font-medium text-foreground transition-colors first:border-primary first:bg-primary/5 hover:border-primary/30"
              >
                {tone}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-heading text-base font-semibold text-foreground">{t("settings.goal.title")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("settings.goal.desc")}</p>
          <div className="mt-4 flex gap-3">
            {[t("onboarding.goal.sales"), t("onboarding.goal.partnerships"), t("onboarding.goal.recruiting")].map((goal) => (
              <button
                key={goal}
                className="rounded-lg border border-border bg-accent px-4 py-2 text-sm font-medium text-foreground transition-colors first:border-primary first:bg-primary/5 hover:border-primary/30"
              >
                {goal}
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
              defaultValue={90}
              className="h-2 w-64 cursor-pointer appearance-none rounded-full bg-border accent-primary"
            />
            <span className="font-heading text-lg font-bold text-foreground">90</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
