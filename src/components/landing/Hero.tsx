import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";

const Hero = () => {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />

      <div className="container relative mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="mb-6 inline-flex items-center rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-success" />
            {t("hero.badge")}
          </div>
          <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl">
            {t("hero.headline")}{" "}
            <span className="text-primary">{t("hero.headlineHighlight")}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            {t("hero.subheadline")}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/onboarding"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/25"
            >
              {t("hero.cta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Play className="h-4 w-4 text-primary" />
              {t("hero.secondaryCta")}
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mx-auto mt-16 max-w-4xl"
        >
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-primary/5">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-destructive/40" />
              <div className="h-3 w-3 rounded-full bg-warning/40" />
              <div className="h-3 w-3 rounded-full bg-success/40" />
              <span className="ml-2 text-xs text-muted-foreground">{t("hero.previewLabel")}</span>
            </div>
            <div className="grid gap-0 md:grid-cols-2">
              <div className="border-b border-border p-6 md:border-b-0 md:border-r">
                <div className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("hero.emailPreview")}</div>
                <div className="mb-2 font-heading text-sm font-semibold text-foreground">
                  Re: Partnership opportunity with Acme Corp
                </div>
                <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                  <p>Hi Sarah,</p>
                  <p>I came across Acme Corp's recent expansion into cloud infrastructure and wanted to reach out about a potential collaboration.</p>
                  <p>We help companies like yours streamline their outbound communication with AI-verified messaging...</p>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("hero.aiReview")}</div>
                <div className="mb-4 flex items-center gap-3">
                  <span className="inline-flex items-center rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                    {t("hero.approved")}
                  </span>
                  <span className="text-sm text-muted-foreground">{t("hero.confidence")} <strong className="text-foreground">94/100</strong></span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 rounded-lg bg-accent/50 p-3">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                    <span className="text-xs text-muted-foreground">{t("hero.noHallucinations")}</span>
                  </div>
                  <div className="flex items-start gap-2 rounded-lg bg-accent/50 p-3">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                    <span className="text-xs text-muted-foreground">{t("hero.personalizationVerified")}</span>
                  </div>
                  <div className="flex items-start gap-2 rounded-lg bg-accent/50 p-3">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                    <span className="text-xs text-muted-foreground">{t("hero.toneProfessional")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
