import { NavLink, Outlet } from "react-router-dom";
import { Shield, Users, PenSquare, ShieldCheck, Send, Settings, CreditCard, LogOut } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { NorwayFlag, UKFlag } from "@/components/Flags";
import type { TranslationKey } from "@/i18n/translations";

const navItems = [
  { to: "/dashboard/contacts", labelKey: "sidebar.contacts" as TranslationKey, icon: Users },
  { to: "/dashboard/create", labelKey: "sidebar.create" as TranslationKey, icon: PenSquare },
  { to: "/dashboard/review", labelKey: "sidebar.review" as TranslationKey, icon: ShieldCheck },
  { to: "/dashboard/sent", labelKey: "sidebar.sent" as TranslationKey, icon: Send },
  { to: "/dashboard/billing", labelKey: "sidebar.billing" as TranslationKey, icon: CreditCard },
  { to: "/dashboard/settings", labelKey: "sidebar.settings" as TranslationKey, icon: Settings },
];

const DashboardLayout = () => {
  const { language, setLanguage, t } = useLanguage();
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="fixed left-0 top-0 z-40 flex h-full w-60 flex-col border-r border-border bg-card">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <Shield className="h-6 w-6 text-primary" />
          <span className="font-heading text-lg font-bold text-foreground">SendSafe</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border p-3 space-y-3">
          {user && (
            <div className="flex items-center justify-between px-1">
              <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              <button
                onClick={signOut}
                className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                title={t("auth.logout")}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="flex items-center justify-center rounded-lg border border-border bg-accent text-sm font-medium">
            <button
              onClick={() => setLanguage("no")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-l-lg px-3 py-1.5 transition-colors ${language === "no" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <NorwayFlag /> NO
            </button>
            <button
              onClick={() => setLanguage("en")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-r-lg px-3 py-1.5 transition-colors ${language === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <UKFlag /> EN
            </button>
          </div>
        </div>
      </aside>

      <main className="ml-60 flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
