import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/i18n/LanguageContext";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PLAN_SEND_LIMITS: Record<string, number> = { free: 10, starter: 300, pro: 1000 };
const PLAN_AI_LIMITS: Record<string, number> = { free: 0, starter: 100, pro: 500 };
const PLAN_PRICES: Record<string, string> = { free: "0 kr", starter: "299 kr", pro: "799 kr" };

const BillingPage = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const plan = profile?.plan ?? "free";

  const { data: sendsUsed = 0 } = useQuery({
    queryKey: ["usage-sends", user?.id, startOfMonth],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("emails")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "sent")
        .gte("sent_at", startOfMonth);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: aiUsed = 0 } = useQuery({
    queryKey: ["usage-ai", user?.id, startOfMonth],
    queryFn: async () => {
      if (!user) return 0;
      const { count: aiEmails } = await supabase
        .from("emails")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("generation_mode", "ai")
        .gte("created_at", startOfMonth);
      const { count: enrichments } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .not("enriched_at", "is", null)
        .gte("enriched_at", startOfMonth);
      return (aiEmails ?? 0) + (enrichments ?? 0);
    },
    enabled: !!user,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("invoices")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  if (isLoading) return <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">{t("billing.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("billing.desc")}</p>
      </div>

      <div className="max-w-2xl space-y-8">
        {/* Current plan + usage */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading text-base font-semibold text-foreground">{t("settings.plan.title")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t("settings.plan.desc")}</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              {t(`plan.${plan}` as "plan.free")} — {PLAN_PRICES[plan]}
              {plan !== "free" && <span className="ml-1 text-xs font-normal text-muted-foreground">{t("pricing.period")}</span>}
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-accent/20 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{t("settings.plan.sends")}</span>
                <span className="text-muted-foreground">{sendsUsed} / {PLAN_SEND_LIMITS[plan]}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-accent">
                <div
                  className={`h-full rounded-full transition-all ${sendsUsed >= PLAN_SEND_LIMITS[plan] ? "bg-destructive" : "bg-primary"}`}
                  style={{ width: `${Math.min(100, (sendsUsed / PLAN_SEND_LIMITS[plan]) * 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{Math.max(0, PLAN_SEND_LIMITS[plan] - sendsUsed)} {t("plan.sendsRemaining")}</p>
            </div>

            <div className="rounded-lg border border-border bg-accent/20 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{t("settings.plan.aiCredits")}</span>
                <span className="text-muted-foreground">{plan === "free" ? "—" : `${aiUsed} / ${PLAN_AI_LIMITS[plan]}`}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-accent">
                {plan !== "free" && (
                  <div
                    className={`h-full rounded-full transition-all ${aiUsed >= PLAN_AI_LIMITS[plan] ? "bg-destructive" : "bg-primary"}`}
                    style={{ width: `${Math.min(100, (aiUsed / PLAN_AI_LIMITS[plan]) * 100)}%` }}
                  />
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {plan === "free" ? t("plan.aiDisabled") : `${Math.max(0, PLAN_AI_LIMITS[plan] - aiUsed)} ${t("plan.aiCreditsRemaining")}`}
              </p>
            </div>
          </div>

          {/* Plan picker */}
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {(["free", "starter", "pro"] as const).map((tier) => {
              const isCurrent = plan === tier;
              return (
                <div key={tier} className={`relative rounded-lg border p-4 ${isCurrent ? "border-primary bg-primary/5" : "border-border bg-accent/20"}`}>
                  {tier === "starter" && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                      {t("pricing.mostPopular")}
                    </span>
                  )}
                  <p className="font-heading text-sm font-semibold text-foreground">{t(`plan.${tier}` as "plan.free")}</p>
                  <p className="mt-0.5 text-lg font-bold text-foreground">
                    {PLAN_PRICES[tier]}
                    {tier !== "free" && <span className="text-xs font-normal text-muted-foreground"> {t("pricing.period")}</span>}
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <li>{PLAN_SEND_LIMITS[tier]} {t("settings.plan.sends").toLowerCase()} {t("pricing.period")}</li>
                    <li>{PLAN_AI_LIMITS[tier] === 0 ? "—" : `${PLAN_AI_LIMITS[tier]} ${t("settings.plan.aiCredits").toLowerCase()}`}</li>
                    <li>{tier === "free" ? t("pricing.feature.standardOnly") : t("pricing.feature.customDomain")}</li>
                  </ul>
                  {isCurrent ? (
                    <span className="mt-3 block text-center text-xs font-medium text-primary">{t("settings.plan.current")}</span>
                  ) : (
                    <button
                      onClick={() => updateProfile.mutate({ plan: tier }, {
                        onSuccess: () => toast.success(t("settings.plan.upgraded")),
                        onError: (err) => toast.error(err.message),
                      })}
                      className={`mt-3 w-full rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        tier === "free"
                          ? "border border-border bg-accent text-foreground hover:bg-accent/80"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }`}
                    >
                      {tier === "free" ? t("settings.plan.downgrade") : t("settings.plan.upgrade")}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Invoices */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-heading text-base font-semibold text-foreground">{t("billing.invoices")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("billing.invoicesDesc")}</p>

          {invoices.length === 0 ? (
            <p className="mt-6 text-center text-sm text-muted-foreground">{t("billing.noInvoices")}</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("billing.col.invoice")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("billing.col.date")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("billing.col.plan")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("billing.col.period")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("billing.col.amount")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("billing.col.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv: any) => (
                    <tr key={inv.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{inv.invoice_number}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(inv.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-foreground capitalize">{inv.plan}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(inv.period_start).toLocaleDateString()} – {new Date(inv.period_end).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {(inv.amount / 100).toLocaleString("nb-NO", { style: "currency", currency: inv.currency })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          inv.status === "paid" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                          inv.status === "pending" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                          "bg-destructive/10 text-destructive"
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillingPage;
