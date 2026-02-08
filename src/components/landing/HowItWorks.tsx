import { motion } from "framer-motion";
import { Upload, Sparkles, ShieldCheck, Send } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Upload your leads",
    description: "Import companies and contacts via Excel or CSV.",
  },
  {
    icon: Sparkles,
    title: "Generate personalized drafts",
    description: "AI creates tailored outbound emails using your tone and goal.",
  },
  {
    icon: ShieldCheck,
    title: "AI review & validation",
    description: "Every email is checked for accuracy, personalization, and compliance.",
  },
  {
    icon: Send,
    title: "Approve & send",
    description: "Send only what you trust — manually or automatically.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20 md:py-28">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-16 max-w-2xl text-center"
        >
          <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From upload to send in four simple steps.
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-4">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative text-center"
            >
              {i < steps.length - 1 && (
                <div className="absolute right-0 top-8 hidden h-px w-full translate-x-1/2 bg-border md:block" />
              )}
              <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <step.icon className="h-7 w-7 text-primary" />
                <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </span>
              </div>
              <h3 className="font-heading text-base font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
