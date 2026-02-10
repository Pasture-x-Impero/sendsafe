import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ArrowRight, ArrowLeft, Upload, Briefcase, Handshake, Users, MessageSquare, Sparkles } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import type { TranslationKey } from "@/i18n/translations";

const steps = [
  { id: "welcome" },
  { id: "goal" },
  { id: "tone" },
  { id: "upload" },
  { id: "success" },
];

const goalItems = [
  { labelKey: "onboarding.goal.sales" as TranslationKey, icon: Briefcase },
  { labelKey: "onboarding.goal.partnerships" as TranslationKey, icon: Handshake },
  { labelKey: "onboarding.goal.recruiting" as TranslationKey, icon: Users },
  { labelKey: "onboarding.goal.other" as TranslationKey, icon: MessageSquare },
];

const toneItems = [
  { labelKey: "onboarding.tone.professional" as TranslationKey, descKey: "onboarding.tone.professionalDesc" as TranslationKey },
  { labelKey: "onboarding.tone.friendly" as TranslationKey, descKey: "onboarding.tone.friendlyDesc" as TranslationKey },
  { labelKey: "onboarding.tone.direct" as TranslationKey, descKey: "onboarding.tone.directDesc" as TranslationKey },
];

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState("");
  const [tone, setTone] = useState("");
  const navigate = useNavigate();
  const { t } = useLanguage();

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex items-center justify-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-8 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-border"}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {step === 0 && (
              <div className="text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h1 className="font-heading text-3xl font-bold text-foreground">{t("onboarding.welcome")}</h1>
                <p className="mt-3 text-muted-foreground">{t("onboarding.welcomeDesc")}</p>
                <button
                  onClick={next}
                  className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {t("onboarding.getStarted")}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {step === 1 && (
              <div>
                <h2 className="font-heading text-2xl font-bold text-foreground">{t("onboarding.goalTitle")}</h2>
                <p className="mt-2 text-muted-foreground">{t("onboarding.goalDesc")}</p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {goalItems.map((g) => (
                    <button
                      key={g.labelKey}
                      onClick={() => setGoal(g.labelKey)}
                      className={`flex items-center gap-3 rounded-xl border p-4 text-left text-sm font-medium transition-all ${
                        goal === g.labelKey
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      <g.icon className="h-5 w-5 shrink-0" />
                      {t(g.labelKey)}
                    </button>
                  ))}
                </div>
                <div className="mt-8 flex items-center justify-between">
                  <button onClick={back} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" /> {t("onboarding.back")}
                  </button>
                  <button
                    onClick={next}
                    disabled={!goal}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
                  >
                    {t("onboarding.continue")} <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="font-heading text-2xl font-bold text-foreground">{t("onboarding.toneTitle")}</h2>
                <p className="mt-2 text-muted-foreground">{t("onboarding.toneDesc")}</p>
                <div className="mt-6 space-y-3">
                  {toneItems.map((ti) => (
                    <button
                      key={ti.labelKey}
                      onClick={() => setTone(ti.labelKey)}
                      className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all ${
                        tone === ti.labelKey
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-primary/30"
                      }`}
                    >
                      <div>
                        <div className="text-sm font-semibold text-foreground">{t(ti.labelKey)}</div>
                        <div className="text-xs text-muted-foreground">{t(ti.descKey)}</div>
                      </div>
                      <div className={`h-4 w-4 rounded-full border-2 ${
                        tone === ti.labelKey ? "border-primary bg-primary" : "border-border"
                      }`} />
                    </button>
                  ))}
                </div>
                <div className="mt-8 flex items-center justify-between">
                  <button onClick={back} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" /> {t("onboarding.back")}
                  </button>
                  <button
                    onClick={next}
                    disabled={!tone}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
                  >
                    {t("onboarding.continue")} <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="font-heading text-2xl font-bold text-foreground">{t("onboarding.uploadTitle")}</h2>
                <p className="mt-2 text-muted-foreground">{t("onboarding.uploadDesc")}</p>
                <div className="mt-6 flex flex-col items-center rounded-xl border-2 border-dashed border-border bg-accent/30 px-6 py-12 text-center transition-colors hover:border-primary/30">
                  <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">{t("onboarding.dragDrop")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t("onboarding.requiredColumns")}</p>
                  <button className="mt-4 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                    {t("onboarding.browse")}
                  </button>
                </div>
                <div className="mt-8 flex items-center justify-between">
                  <button onClick={back} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" /> {t("onboarding.back")}
                  </button>
                  <button
                    onClick={next}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    {t("onboarding.skip")} <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10">
                  <Sparkles className="h-8 w-8 text-success" />
                </div>
                <h1 className="font-heading text-3xl font-bold text-foreground">{t("onboarding.successTitle")}</h1>
                <p className="mt-3 text-muted-foreground">{t("onboarding.successDesc")}</p>
                <button
                  onClick={() => navigate("/dashboard/approval")}
                  className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {t("onboarding.goToApproval")}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Onboarding;
