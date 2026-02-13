import { Link } from "react-router-dom";
import { Shield, ArrowRight, LogOut } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

const Navbar = () => {
  const { language, setLanguage, t } = useLanguage();
  const { user, signOut } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <span className="font-heading text-xl font-bold text-foreground">SendSafe</span>
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          <a href="#how-it-works" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {t("nav.howItWorks")}
          </a>
          <a href="#why" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {t("nav.why")}
          </a>
          <a href="#pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {t("nav.pricing")}
          </a>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-border bg-card text-sm font-medium">
            <button
              onClick={() => setLanguage("en")}
              className={`rounded-l-lg px-2.5 py-1.5 transition-colors ${language === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage("no")}
              className={`rounded-r-lg px-2.5 py-1.5 transition-colors ${language === "no" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              NO
            </button>
          </div>
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {t("nav.dashboard")}
              </Link>
              <button
                onClick={signOut}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                {t("auth.logout")}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                {t("auth.login")}
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {t("auth.signUp")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
