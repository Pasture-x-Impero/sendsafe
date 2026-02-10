import { useLanguage } from "@/i18n/LanguageContext";

const drafts = [
  { company: "Acme Corp", contact: "Sarah Chen", subject: "Partnership opportunity with Acme Corp", confidence: 94, status: "Approved" },
  { company: "Globex Inc", contact: "John Smith", subject: "Streamline your outbound with AI", confidence: 72, status: "Needs review" },
  { company: "Initech", contact: "Mike Ross", subject: "Quick question about Initech's growth plans", confidence: 88, status: "Draft" },
  { company: "Stark Industries", contact: "Tony Stark", subject: "AI-powered communication for Stark Industries", confidence: 61, status: "Needs review" },
];

const statusStyles: Record<string, string> = {
  "Approved": "bg-success/10 text-success",
  "Needs review": "bg-warning/10 text-warning",
  "Draft": "bg-accent text-muted-foreground",
  "Sent": "bg-primary/10 text-primary",
};

const DraftsPage = () => {
  const { t } = useLanguage();

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">{t("drafts.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("drafts.desc")}</p>
      </div>

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
            {drafts.map((draft, i) => (
              <tr key={i} className="border-b border-border last:border-0 transition-colors hover:bg-accent/30 cursor-pointer">
                <td className="px-4 py-3 text-sm font-medium text-foreground">{draft.company}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{draft.contact}</td>
                <td className="px-4 py-3 text-sm text-foreground">{draft.subject}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 overflow-hidden rounded-full bg-border">
                      <div
                        className={`h-full rounded-full ${draft.confidence >= 80 ? "bg-success" : draft.confidence >= 60 ? "bg-warning" : "bg-destructive"}`}
                        style={{ width: `${draft.confidence}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">{draft.confidence}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[draft.status] || ""}`}>
                    {draft.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DraftsPage;
