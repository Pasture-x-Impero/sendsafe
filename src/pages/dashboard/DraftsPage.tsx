import { useLanguage } from "@/i18n/LanguageContext";
import { useEmails } from "@/hooks/use-emails";

import type { TranslationKey } from "@/i18n/translations";

const statusStyles: Record<string, string> = {
  approved: "bg-success/10 text-success",
  needs_review: "bg-warning/10 text-warning",
  draft: "bg-accent text-muted-foreground",
  sent: "bg-primary/10 text-primary",
};

const statusLabelKeys: Record<string, TranslationKey> = {
  approved: "drafts.status.approved",
  needs_review: "drafts.status.needs_review",
  draft: "drafts.status.draft",
  sent: "drafts.status.sent",
};

const DraftsPage = () => {
  const { t } = useLanguage();
  const { data: emails = [], isLoading } = useEmails(["draft", "needs_review", "approved"]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">{t("drafts.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("drafts.desc")}</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : emails.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          {t("drafts.empty")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-accent/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("drafts.col.company")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("drafts.col.contact")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("drafts.col.subject")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("drafts.col.confidence")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("drafts.col.status")}</th>
              </tr>
            </thead>
            <tbody>
              {emails.map((email) => (
                <tr key={email.id} className="border-b border-border last:border-0 transition-colors hover:bg-accent/30 cursor-pointer">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{email.company}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{email.contact_name}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{email.subject}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-border">
                        <div
                          className={`h-full rounded-full ${email.confidence >= 80 ? "bg-success" : email.confidence >= 60 ? "bg-warning" : "bg-destructive"}`}
                          style={{ width: `${email.confidence}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">{email.confidence}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[email.status] || ""}`}>
                      {statusLabelKeys[email.status] ? t(statusLabelKeys[email.status]) : email.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DraftsPage;
