import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import type { TranslationKey } from "@/i18n/translations";

const Pricing = () => {
  const { t } = useLanguage();

  const plans = [
    {
      nameKey: "pricing.free.name" as TranslationKey,
      price: "$0",
      period: "",
      descKey: "pricing.free.desc" as TranslationKey,
      featureKeys: ["pricing.feature.50gen", "pricing.feature.10sends", "pricing.feature.manual"] as TranslationKey[],
      ctaKey: "pricing.free.cta" as TranslationKey,
      highlighted: false,
    },
    {
      nameKey: "pricing.starter.name" as TranslationKey,
      price: "$29",
      period: "/ month",
      descKey: "pricing.starter.desc" as TranslationKey,
      featureKeys: ["pricing.feature.500credits", "pricing.feature.300sends", "pricing.feature.autosend", "pricing.feature.emailSupport"] as TranslationKey[],
      ctaKey: "pricing.starter.cta" as TranslationKey,
      highlighted: true,
    },
    {
      nameKey: "pricing.pro.name" as TranslationKey,
      price: "$79",
      period: "/ month",
      descKey: "pricing.pro.desc" as TranslationKey,
      featureKeys: ["pricing.feature.2000credits", "pricing.feature.highSends", "pricing.feature.team", "pricing.feature.custom"] as TranslationKey[],
      ctaKey: "pricing.pro.cta" as TranslationKey,
      highlighted: false,
    },
  ];

  return (
    <section id="pricing" className="py-20 md:py-28">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-16 max-w-2xl text-center"
        >
          <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl">
            {t("pricing.title")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t("pricing.subtitle")}
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-xl border p-6 ${
                plan.highlighted
                  ? "border-primary bg-card shadow-xl shadow-primary/10"
                  : "border-border bg-card"
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  {t("pricing.mostPopular")}
                </span>
              )}
              <h3 className="font-heading text-lg font-semibold text-foreground">{t(plan.nameKey)}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t(plan.descKey)}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-heading text-4xl font-bold text-foreground">{plan.price}</span>
                {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
              </div>
              <ul className="mt-6 space-y-3">
                {plan.featureKeys.map((fk) => (
                  <li key={fk} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {t(fk)}
                  </li>
                ))}
              </ul>
              <Link
                to="/onboarding"
                className={`mt-6 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                  plan.highlighted
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border bg-accent text-foreground hover:bg-accent/80"
                }`}
              >
                {t(plan.ctaKey)}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
