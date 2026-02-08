import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ArrowRight, ArrowLeft, Upload, Briefcase, Handshake, Users, MessageSquare, Sparkles, Zap } from "lucide-react";

const steps = [
  { id: "welcome" },
  { id: "goal" },
  { id: "tone" },
  { id: "upload" },
  { id: "success" },
];

const goals = [
  { label: "Sales outreach", icon: Briefcase },
  { label: "Partnerships", icon: Handshake },
  { label: "Recruiting", icon: Users },
  { label: "Other", icon: MessageSquare },
];

const tones = [
  { label: "Professional", description: "Formal and polished" },
  { label: "Friendly", description: "Warm and approachable" },
  { label: "Direct", description: "Clear and to the point" },
];

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState("");
  const [tone, setTone] = useState("");
  const navigate = useNavigate();

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-8 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-border"
              }`}
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
                <h1 className="font-heading text-3xl font-bold text-foreground">
                  Welcome to DraftGuard
                </h1>
                <p className="mt-3 text-muted-foreground">
                  Let's make sure your AI emails are safe to send.
                </p>
                <button
                  onClick={next}
                  className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Get started
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {step === 1 && (
              <div>
                <h2 className="font-heading text-2xl font-bold text-foreground">
                  What are you using DraftGuard for?
                </h2>
                <p className="mt-2 text-muted-foreground">This helps us tailor your email templates.</p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {goals.map((g) => (
                    <button
                      key={g.label}
                      onClick={() => setGoal(g.label)}
                      className={`flex items-center gap-3 rounded-xl border p-4 text-left text-sm font-medium transition-all ${
                        goal === g.label
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      <g.icon className="h-5 w-5 shrink-0" />
                      {g.label}
                    </button>
                  ))}
                </div>
                <div className="mt-8 flex items-center justify-between">
                  <button onClick={back} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button
                    onClick={next}
                    disabled={!goal}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
                  >
                    Continue <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="font-heading text-2xl font-bold text-foreground">
                  How should your emails sound?
                </h2>
                <p className="mt-2 text-muted-foreground">Choose a default tone for your drafts.</p>
                <div className="mt-6 space-y-3">
                  {tones.map((t) => (
                    <button
                      key={t.label}
                      onClick={() => setTone(t.label)}
                      className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all ${
                        tone === t.label
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-primary/30"
                      }`}
                    >
                      <div>
                        <div className="text-sm font-semibold text-foreground">{t.label}</div>
                        <div className="text-xs text-muted-foreground">{t.description}</div>
                      </div>
                      <div className={`h-4 w-4 rounded-full border-2 ${
                        tone === t.label ? "border-primary bg-primary" : "border-border"
                      }`} />
                    </button>
                  ))}
                </div>
                <div className="mt-8 flex items-center justify-between">
                  <button onClick={back} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button
                    onClick={next}
                    disabled={!tone}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
                  >
                    Continue <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="font-heading text-2xl font-bold text-foreground">
                  Upload your leads
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Upload a CSV or Excel file to generate your first drafts.
                </p>
                <div className="mt-6 flex flex-col items-center rounded-xl border-2 border-dashed border-border bg-accent/30 px-6 py-12 text-center transition-colors hover:border-primary/30">
                  <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">
                    Drag & drop your file here
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Required columns: company name, contact email
                  </p>
                  <button className="mt-4 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                    Browse files
                  </button>
                </div>
                <div className="mt-8 flex items-center justify-between">
                  <button onClick={back} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button
                    onClick={next}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Skip for now <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10">
                  <Sparkles className="h-8 w-8 text-success" />
                </div>
                <h1 className="font-heading text-3xl font-bold text-foreground">
                  Your first drafts are ready
                </h1>
                <p className="mt-3 text-muted-foreground">
                  Review them before sending.
                </p>
                <button
                  onClick={() => navigate("/dashboard/approval")}
                  className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Go to approval queue
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
