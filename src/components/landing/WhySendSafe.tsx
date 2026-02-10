import { motion } from "framer-motion";
import { ShieldAlert, UserCheck, MailWarning, Lock } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const WhySendSafe = () => {
  const { t } = useLanguage();

  const reasons = [
    { icon: ShieldAlert, title: t("why.reason1.title"), description: t("why.reason1.desc") },
    { icon: UserCheck, title: t("why.reason2.title"), description: t("why.reason2.desc") },
    { icon: MailWarning, title: t("why.reason3.title"), description: t("why.reason3.desc") },
    { icon: Lock, title: t("why.reason4.title"), description: t("why.reason4.desc") },
  ];

  return (
    <section id="why" className="bg-accent/30 py-20 md:py-28">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-16 max-w-2xl text-center"
        >
          <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl">
            {t("why.title")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t("why.subtitle")} <strong className="text-foreground">{t("why.subtitleBold")}</strong>
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {reasons.map((reason, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <reason.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground">{reason.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{reason.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhySendSafe;
