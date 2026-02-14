import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ArrowRight, ArrowLeft, Upload, Briefcase, Handshake, Users, MessageSquare, Sparkles } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import type { TranslationKey } from "@/i18n/translations";

const steps = [
  { id: "welcome" },
  { id: "goal" },
  { id: "tone" },
  { id: "signup" },
  { id: "upload" },
  { id: "success" },
];

const goalItems: { value: string; labelKey: TranslationKey; icon: typeof Briefcase }[] = [
  { value: "sales", labelKey: "onboarding.goal.sales", icon: Briefcase },
  { value: "partnerships", labelKey: "onboarding.goal.partnerships", icon: Handshake },
  { value: "recruiting", labelKey: "onboarding.goal.recruiting", icon: Users },
  { value: "other", labelKey: "onboarding.goal.other", icon: MessageSquare },
];

const toneItems: { value: string; labelKey: TranslationKey; descKey: TranslationKey }[] = [
  { value: "professional", labelKey: "onboarding.tone.professional", descKey: "onboarding.tone.professionalDesc" },
  { value: "friendly", labelKey: "onboarding.tone.friendly", descKey: "onboarding.tone.friendlyDesc" },
  { value: "direct", labelKey: "onboarding.tone.direct", descKey: "onboarding.tone.directDesc" },
];

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState("");
  const [tone, setTone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [signingUp, setSigningUp] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, signUp } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  // If already logged in and onboarding completed, go to dashboard
  useEffect(() => {
    if (!isLoading && user && profile?.onboarding_completed) {
      navigate("/dashboard", { replace: true });
    }
  }, [isLoading, user, profile, navigate]);

  // If user is already logged in, skip the signup step
  useEffect(() => {
    if (user && step === 3) {
      setStep(4);
    }
  }, [user, step]);

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setSigningUp(true);
    const { error } = await signUp(email, password);
    setSigningUp(false);
    if (error) {
      setAuthError(error.message);
    } else {
      next();
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    await updateProfile.mutateAsync({
      goal: goal as "sales" | "partnerships" | "recruiting" | "other",
      tone: tone as "professional" | "friendly" | "direct",
      onboarding_completed: true,
    });
    navigate("/dashboard/approval");
  };

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
                      key={g.value}
                      onClick={() => setGoal(g.value)}
                      className={`flex items-center gap-3 rounded-xl border p-4 text-left text-sm font-medium transition-all ${
                        goal === g.value
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
                      key={ti.value}
                      onClick={() => setTone(ti.value)}
                      className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all ${
                        tone === ti.value
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-primary/30"
                      }`}
                    >
                      <div>
                        <div className="text-sm font-semibold text-foreground">{t(ti.labelKey)}</div>
                        <div className="text-xs text-muted-foreground">{t(ti.descKey)}</div>
                      </div>
                      <div className={`h-4 w-4 rounded-full border-2 ${
                        tone === ti.value ? "border-primary bg-primary" : "border-border"
                      }`} />
                    </button>
                  ))}
                </div>
                <div className="mt-8 flex items-center justify-between">
                  <button onClick={back} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" /> {t("onboarding.back")}
                  </button>
                  <button
                    onClick={() => {
                      if (user) {
                        setStep(4); // skip signup if already logged in
                      } else {
                        next();
                      }
                    }}
                    disabled={!tone}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
                  >
                    {t("onboarding.continue")} <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && !user && (
              <div>
                <h2 className="font-heading text-2xl font-bold text-foreground">{t("onboarding.signupTitle")}</h2>
                <p className="mt-2 text-muted-foreground">{t("onboarding.signupDesc")}</p>
                <form onSubmit={handleSignUp} className="mt-6 space-y-4">
                  {authError && (
                    <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {authError}
                    </div>
                  )}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">{t("auth.email")}</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">{t("auth.password")}</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-4">
                    <button type="button" onClick={back} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                      <ArrowLeft className="h-4 w-4" /> {t("onboarding.back")}
                    </button>
                    <button
                      type="submit"
                      disabled={signingUp}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                      {signingUp ? t("auth.creatingAccount") : t("auth.signUp")}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </form>
                <p className="mt-6 text-center text-sm text-muted-foreground">
                  {t("auth.hasAccount")}{" "}
                  <Link to="/login" className="font-medium text-primary hover:underline">
                    {t("auth.login")}
                  </Link>
                </p>
              </div>
            )}

            {step === 4 && (
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
                  <button onClick={() => setStep(user ? 2 : 3)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
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

            {step === 5 && (
              <div className="text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10">
                  <Sparkles className="h-8 w-8 text-success" />
                </div>
                <h1 className="font-heading text-3xl font-bold text-foreground">{t("onboarding.successTitle")}</h1>
                <p className="mt-3 text-muted-foreground">{t("onboarding.successDesc")}</p>
                <button
                  onClick={handleComplete}
                  disabled={updateProfile.isPending}
                  className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
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
