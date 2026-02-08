import { ArrowRight, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-accent/30">
      {/* Final CTA */}
      <div className="container mx-auto px-6 py-16 text-center">
        <h2 className="font-heading text-2xl font-bold text-foreground md:text-3xl">
          Start sending AI emails you actually trust
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
          DraftGuard verifies every email before it's sent. No hallucinations. No risky claims.
        </p>
        <Link
          to="/onboarding"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
        >
          Get started free
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-6 py-6 md:flex-row">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-heading text-sm font-semibold text-foreground">DraftGuard</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} DraftGuard. AI emails, verified before sending.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
