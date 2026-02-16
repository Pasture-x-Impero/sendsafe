import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useLanguage } from "@/i18n/LanguageContext";
import { useEmails } from "@/hooks/use-emails";

const SentPage = () => {
  const { t } = useLanguage();
  const { data: emails = [], isLoading } = useEmails("sent");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">{t("sent.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("sent.desc")}</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : emails.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          {t("sent.empty")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-accent/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("sent.col.company")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("sent.col.contact")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("sent.col.subject")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("sent.col.sent")}</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {emails.map((email) => (
                <>
                  <tr
                    key={email.id}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-accent/30"
                    onClick={() => setExpandedId(expandedId === email.id ? null : email.id)}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{email.company}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{email.contact_name}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{email.subject}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {email.sent_at
                        ? formatDistanceToNow(new Date(email.sent_at), { addSuffix: true })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {expandedId === email.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </td>
                  </tr>
                  {expandedId === email.id && (
                    <tr key={email.id + "-body"}>
                      <td colSpan={5} className="border-b border-border bg-accent/20 px-6 py-4">
                        <p className="whitespace-pre-wrap text-sm text-foreground">{email.body}</p>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SentPage;
