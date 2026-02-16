import { useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle, Send, FlaskConical } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/use-profile";
import { useEmails, useApproveEmail, useApproveAllEmails, useSendEmail, useUpdateEmail } from "@/hooks/use-emails";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  draft: "bg-accent text-foreground",
  needs_review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
};

const ReviewPage = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: emails = [], isLoading } = useEmails(["draft", "needs_review", "approved"]);
  const approveEmail = useApproveEmail();
  const approveAll = useApproveAllEmails();
  const sendEmail = useSendEmail();
  const updateEmail = useUpdateEmail();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [sending, setSending] = useState(false);

  const current = emails[currentIndex];
  const total = emails.length;

  const goNext = () => setCurrentIndex((i) => Math.min(i + 1, total - 1));
  const goPrev = () => setCurrentIndex((i) => Math.max(i - 1, 0));

  const hasSmtp = !!profile?.smtp_sender_email;

  const handleApprove = async () => {
    if (!current) return;
    await approveEmail.mutateAsync(current.id);
  };

  const handleApproveAll = async () => {
    await approveAll.mutateAsync();
    toast.success(t("review.approveAll"));
  };

  const handleSend = async () => {
    if (!current) return;
    if (!hasSmtp) {
      toast.error(t("review.smtpRequired"));
      return;
    }
    setSending(true);
    try {
      await sendEmail.mutateAsync({ emailId: current.id });
      toast.success(t("review.sent"));
      if (currentIndex < total - 1) goNext();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Send failed";
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const handleSendAllApproved = async () => {
    if (!hasSmtp) {
      toast.error(t("review.smtpRequired"));
      return;
    }
    const approvedEmails = emails.filter((e) => e.status === "approved");
    setSending(true);
    let sent = 0;
    for (const email of approvedEmails) {
      try {
        await sendEmail.mutateAsync({ emailId: email.id });
        sent++;
      } catch {
        // continue with rest
      }
    }
    setSending(false);
    toast.success(`${sent} ${t("review.sent")}`);
  };

  const handleSendTest = async () => {
    if (!current || !user) return;
    if (!hasSmtp) {
      toast.error(t("review.smtpRequired"));
      return;
    }
    setSending(true);
    try {
      await sendEmail.mutateAsync({ emailId: current.id, testEmail: user.email! });
      toast.success(t("review.testSent"));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Send test failed";
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const handleApproveSend = async () => {
    if (!current) return;
    if (!hasSmtp) {
      toast.error(t("review.smtpRequired"));
      return;
    }
    setSending(true);
    try {
      await approveEmail.mutateAsync(current.id);
      await sendEmail.mutateAsync({ emailId: current.id });
      toast.success(t("review.sent"));
      if (currentIndex < total - 1) goNext();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed";
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const handleSubjectBlur = (value: string) => {
    if (!current || value === current.subject) return;
    updateEmail.mutate({ id: current.id, subject: value });
  };

  const handleBodyBlur = (value: string) => {
    if (!current || value === current.body) return;
    updateEmail.mutate({ id: current.id, body: value });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">{t("review.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("review.desc")}</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : emails.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          {t("review.empty")}
        </div>
      ) : (
        <>
          {/* Top bar */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={goPrev}
                disabled={currentIndex === 0}
                className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-accent disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium text-foreground">
                {currentIndex + 1} {t("review.of")} {total}
              </span>
              <button
                onClick={goNext}
                disabled={currentIndex === total - 1}
                className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-accent disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1" />

            <button
              onClick={handleApproveAll}
              disabled={approveAll.isPending}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              {t("review.approveAll")}
            </button>

            <button
              onClick={handleSendAllApproved}
              disabled={sending || !emails.some((e) => e.status === "approved")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
              {t("review.sendAll")}
            </button>
          </div>

          {current && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left: Email preview/edit */}
              <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
                <div className="mb-4">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("review.to")}</label>
                  <div className="text-sm text-foreground">{current.contact_name} &lt;{current.contact_email}&gt;</div>
                </div>

                <div className="mb-4">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("review.subject")}</label>
                  <input
                    key={current.id + "-subject"}
                    defaultValue={current.subject}
                    onBlur={(e) => handleSubjectBlur(e.target.value)}
                    className="w-full rounded-lg border border-border bg-accent/30 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("review.body")}</label>
                  <textarea
                    key={current.id + "-body"}
                    defaultValue={current.body}
                    onBlur={(e) => handleBodyBlur(e.target.value)}
                    rows={12}
                    className="w-full rounded-lg border border-border bg-accent/30 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Right: Status & actions */}
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="mb-4">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("review.status")}</label>
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusColors[current.status] || ""}`}>
                      {t(`review.status.${current.status}` as "review.status.draft")}
                    </span>
                  </div>

                  <div className="mb-2 text-xs text-muted-foreground">
                    {current.company} &middot; {current.contact_email}
                  </div>

                  <div className="space-y-2">
                    {current.status === "draft" || current.status === "needs_review" ? (
                      <>
                        <button
                          onClick={handleApprove}
                          disabled={approveEmail.isPending}
                          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                        >
                          <CheckCircle className="h-4 w-4" /> {t("review.approve")}
                        </button>
                        <button
                          onClick={handleApproveSend}
                          disabled={sending}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                        >
                          <Send className="h-4 w-4" /> {sending ? t("review.sending") : t("review.approveSend")}
                        </button>
                      </>
                    ) : current.status === "approved" ? (
                      <button
                        onClick={handleSend}
                        disabled={sending}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" /> {sending ? t("review.sending") : t("review.send")}
                      </button>
                    ) : null}

                    {current.status !== "sent" && (
                      <button
                        onClick={handleSendTest}
                        disabled={sending}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
                      >
                        <FlaskConical className="h-4 w-4" /> {t("review.sendTest")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReviewPage;
