import { Link } from "react-router-dom";
import { Shield, ArrowRight } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <span className="font-heading text-xl font-bold text-foreground">DraftGuard</span>
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          <a href="#how-it-works" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            How it works
          </a>
          <a href="#why" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Why DraftGuard
          </a>
          <a href="#pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Pricing
          </a>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/onboarding"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Get started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
