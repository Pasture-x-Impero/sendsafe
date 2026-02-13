import { useState } from "react";
import { Check, RefreshCw, Pencil, Send, AlertTriangle, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useEmails, useApproveEmail, useSendEmail } from "@/hooks/use-emails";

const ApprovalPage = () => {
  const [selected, setSelected] = useState(0);
  const { t } = useLanguage();
  const { data: emails = [], isLoading } = useEmails(["draft", "needs_review"]);
  const approveEmail = useApproveEmail();
  const sendEmail = useSendEmail();

  const email = emails[selected];

  const handleApproveAndSend = async () => {
    if (!email) return;
    await approveEmail.mutateAsync(email.id);
    await sendEmail.mutateAsync(email.id);
  };

  if (isLoading) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-bold text-foreground">{t("approval.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("approval.desc")}</p>
        </div>
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-bold text-foreground">{t("approval.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("approval.desc")}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          {t("approval.empty")}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">{t("approval.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("approval.desc")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
        <div className="space-y-4">
          <div className="flex gap-2">
            {emails.map((e, i) => (
              <button
                key={e.id}
                onClick={() => setSelected(i)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                  selected === i
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/30"
                }`}
              >
                <div className="font-medium">{e.company}</div>
                <div className="text-xs text-muted-foreground">{e.contact_name}</div>
              </button>
            ))}
          </div>

          {email && (
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("approval.emailPreview")}</div>
              <h3 className="font-heading text-lg font-semibold text-foreground">{email.subject}</h3>
              <div className="mt-1 text-xs text-muted-foreground">To: {email.contact_name}</div>
              <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {email.body}
              </div>
            </div>
          )}
        </div>

        {email && (
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("approval.aiReview")}</div>

            <div className="mb-6 flex items-center gap-3">
              {email.approved ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-sm font-semibold text-success">
                  <ShieldCheck className="h-4 w-4" /> {t("approval.approved")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1.5 text-sm font-semibold text-warning">
                  <AlertTriangle className="h-4 w-4" /> {t("approval.issuesFound")}
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                {t("approval.confidence")} <strong className="text-foreground">{email.confidence}/100</strong>
              </span>
            </div>

            {email.issues.length > 0 && (
              <div className="mb-6">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("approval.issues")}</div>
                <div className="space-y-2">
                  {email.issues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg bg-warning/5 p-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                      <span className="text-sm text-muted-foreground">{issue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {email.approved && (
              <div className="mb-6 space-y-2">
                {[t("approval.noHallucinations"), t("approval.personalizationVerified"), t("approval.toneProfessional")].map((check) => (
                  <div key={check} className="flex items-start gap-2 rounded-lg bg-success/5 p-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span className="text-sm text-muted-foreground">{check}</span>
                  </div>
                ))}
              </div>
            )}

            {email.suggestions && (
              <div className="mb-6">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("approval.suggestion")}</div>
                <p className="text-sm text-muted-foreground">{email.suggestions}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleApproveAndSend}
                disabled={approveEmail.isPending || sendEmail.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="h-4 w-4" /> {t("approval.approveAndSend")}
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                <RefreshCw className="h-4 w-4" /> {t("approval.regenerate")}
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                <Pencil className="h-4 w-4" /> {t("approval.editManually")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalPage;
