import { motion } from "framer-motion";
import { ShieldAlert, UserCheck, MailWarning, Lock } from "lucide-react";

const reasons = [
  {
    icon: ShieldAlert,
    title: "Prevents hallucinated company facts",
    description: "AI review catches made-up claims about companies before they reach your prospects.",
  },
  {
    icon: UserCheck,
    title: "Catches incorrect personalization",
    description: "Ensures names, titles, and company details are accurate in every email.",
  },
  {
    icon: MailWarning,
    title: "Reduces spam-trigger language",
    description: "Flags words and patterns that increase the chance of landing in spam folders.",
  },
  {
    icon: Lock,
    title: "Keeps humans in control",
    description: "Nothing sends without your explicit approval. You stay in the loop, always.",
  },
];

const WhyDraftGuard = () => {
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
            Why DraftGuard
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            DraftGuard doesn't just generate emails. <strong className="text-foreground">It verifies them.</strong>
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {reasons.map((reason, i) => (
            <motion.div
              key={reason.title}
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

export default WhyDraftGuard;
