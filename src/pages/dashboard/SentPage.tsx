import { CheckCircle } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const sentEmails = [
  { company: "Acme Corp", contact: "Sarah Chen", subject: "Partnership opportunity with Acme Corp", sentAt: "2 hours ago", confidence: 94 },
  { company: "Wayne Enterprises", contact: "Bruce Wayne", subject: "Security solutions for Wayne Enterprises", sentAt: "1 day ago", confidence: 91 },
  { company: "Pied Piper", contact: "Richard Hendricks", subject: "AI communication tools for Pied Piper", sentAt: "2 days ago", confidence: 87 },
];

const SentPage = () => {
  const { t } = useLanguage();

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">{t("sent.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("sent.desc")}</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-accent/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("sent.col.company")}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("sent.col.contact")}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("sent.col.subject")}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("sent.col.confidence")}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("sent.col.sent")}</th>
            </tr>
          </thead>
          <tbody>
            {sentEmails.map((email, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-sm font-medium text-foreground">{email.company}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{email.contact}</td>
                <td className="px-4 py-3 text-sm text-foreground">{email.subject}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-sm text-success">
                    <CheckCircle className="h-3.5 w-3.5" /> {email.confidence}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{email.sentAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SentPage;
