import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "",
    description: "Try DraftGuard risk-free",
    features: ["50 AI generations", "10 sends", "Manual approval"],
    cta: "Start free",
    highlighted: false,
  },
  {
    name: "Starter",
    price: "$29",
    period: "/ month",
    description: "For growing outbound teams",
    features: ["500 AI credits", "300 sends", "Auto-send above confidence threshold", "Email support"],
    cta: "Upgrade to Starter",
    highlighted: true,
  },
  {
    name: "Pro",
    price: "$79",
    period: "/ month",
    description: "For teams at scale",
    features: ["2,000 AI credits", "High send limits", "Team access", "Custom prompt presets"],
    cta: "Go Pro",
    highlighted: false,
  },
];

const Pricing = () => {
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
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Pay for confidence at scale, not just email volume.
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
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
                  Most popular
                </span>
              )}
              <h3 className="font-heading text-lg font-semibold text-foreground">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-heading text-4xl font-bold text-foreground">{plan.price}</span>
                {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
              </div>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {feature}
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
                {plan.cta}
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
