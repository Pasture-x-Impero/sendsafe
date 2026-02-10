import { ArrowRight, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border bg-accent/30">
      <div className="container mx-auto px-6 py-16 text-center">
        <h2 className="font-heading text-2xl font-bold text-foreground md:text-3xl">
          {t("footer.cta")}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
          {t("footer.ctaDesc")}
        </p>
        <Link
          to="/onboarding"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
        >
          {t("footer.ctaButton")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="border-t border-border">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-6 py-6 md:flex-row">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-heading text-sm font-semibold text-foreground">SendSafe</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} SendSafe. {t("footer.copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
