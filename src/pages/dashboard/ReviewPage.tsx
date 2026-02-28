import { useState, useMemo, useCallback, useRef } from "react";
import { CheckCircle, Send, FlaskConical, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import DOMPurify from "dompurify";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/use-profile";
import { useEmails, useApproveEmail, useApproveAllEmails, useSendEmail, useUpdateEmail, useDeleteEmail } from "@/hooks/use-emails";
import { toast } from "sonner";
import type { Email } from "@/types/database";

const statusColors: Record<string, string> = {
  draft: "bg-accent text-foreground",
  needs_review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
};

interface CampaignGroup {
  campaignId: string | null;
  label: string;
  emails: Email[];
}

const ReviewPage = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: emails = [], isLoading } = useEmails(["draft", "needs_review", "approved"]);
  const approveEmail = useApproveEmail();
  const approveAll = useApproveAllEmails();
  const sendEmail = useSendEmail();
  const updateEmail = useUpdateEmail();
  const deleteEmail = useDeleteEmail();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const hasSmtp = !!profile?.smtp_sender_email;

  // Group emails by campaign_id
  const campaignGroups = useMemo<CampaignGroup[]>(() => {
    const grouped = new Map<string | null, Email[]>();
    for (const email of emails) {
      const key = email.campaign_id;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(email);
    }
    const groups: CampaignGroup[] = [];
    for (const [campaignId, groupEmails] of grouped) {
      const name = groupEmails[0]?.campaign_name;
      groups.push({
        campaignId,
        label: campaignId
          ? name || `${t("review.campaign")}: ${campaignId.slice(0, 8)}…`
          : t("review.noCampaign"),
        emails: groupEmails,
      });
    }
    return groups;
  }, [emails, t]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleApproveAll = async () => {
    await approveAll.mutateAsync();
    toast.success(t("review.approveAll"));
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

  const handleApprove = async (email: Email) => {
    await approveEmail.mutateAsync(email.id);
  };

  const handleSend = async (email: Email) => {
    if (!hasSmtp) {
      toast.error(t("review.smtpRequired"));
      return;
    }
    setSending(true);
    try {
      await sendEmail.mutateAsync({ emailId: email.id });
      toast.success(t("review.sent"));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Send failed";
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const handleApproveSend = async (email: Email) => {
    if (!hasSmtp) {
      toast.error(t("review.smtpRequired"));
      return;
    }
    setSending(true);
    try {
      await approveEmail.mutateAsync(email.id);
      await sendEmail.mutateAsync({ emailId: email.id });
      toast.success(t("review.sent"));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed";
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const handleSendTest = async (email: Email) => {
    if (!user) return;
    if (!hasSmtp) {
      toast.error(t("review.smtpRequired"));
      return;
    }
    setSending(true);
    try {
      await sendEmail.mutateAsync({ emailId: email.id, testEmail: user.email! });
      toast.success(t("review.testSent"));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Send test failed";
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (emailId: string) => {
    if (confirmDeleteId !== emailId) {
      setConfirmDeleteId(emailId);
      return;
    }
    try {
      await deleteEmail.mutateAsync(emailId);
      if (expandedId === emailId) setExpandedId(null);
      setConfirmDeleteId(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Delete failed";
      toast.error(message);
    }
  };

  const handleSubjectBlur = (email: Email, value: string) => {
    if (value === email.subject) return;
    updateEmail.mutate({ id: email.id, subject: value });
  };

  const handleBodyBlur = (email: Email, el: HTMLDivElement) => {
    const html = el.innerHTML.trim();
    if (html === email.body) return;
    updateEmail.mutate({ id: email.id, body: html });
  };

  const groupKey = (g: CampaignGroup) => g.campaignId ?? "__ungrouped";

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
          {/* Top bar — bulk actions */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {emails.length} {emails.length === 1 ? "email" : "emails"}
            </span>
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

          {/* Campaign groups */}
          <div className="space-y-4">
            {campaignGroups.map((group) => {
              const key = groupKey(group);
              const isCollapsed = collapsedGroups.has(key);
              return (
                <div key={key} className="rounded-xl border border-border bg-card overflow-hidden">
                  {/* Group header */}
                  <button
                    onClick={() => toggleGroup(key)}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-foreground hover:bg-accent/50 transition-colors"
                  >
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <span>{group.label}</span>
                    <span className="ml-auto text-xs font-normal text-muted-foreground">
                      {group.emails.length} {group.emails.length === 1 ? "email" : "emails"}
                    </span>
                  </button>

                  {!isCollapsed && (
                    <div>
                      {/* Table header */}
                      <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 border-t border-border bg-accent/30 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <span>{t("review.colRecipient")}</span>
                        <span>{t("review.colSubject")}</span>
                        <span>{t("review.colStatus")}</span>
                        <span>{t("review.colActions")}</span>
                      </div>

                      {/* Email rows */}
                      {group.emails.map((email) => (
                        <div key={email.id}>
                          {/* Row */}
                          <div
                            onClick={() => setExpandedId(expandedId === email.id ? null : email.id)}
                            className={`grid cursor-pointer grid-cols-[1fr_1fr_auto_auto] items-center gap-4 border-t border-border px-4 py-3 text-sm transition-colors hover:bg-accent/40 ${expandedId === email.id ? "bg-accent/20" : ""}`}
                          >
                            <div className="min-w-0">
                              <div className="truncate font-medium text-foreground">{email.contact_name}</div>
                              <div className="truncate text-xs text-muted-foreground">{email.contact_email}</div>
                              {email.issues.filter((i) => i.startsWith("MISSING_FIELD:")).length > 0 && (
                                <div className="mt-0.5">
                                  <span className="rounded border border-yellow-500/30 bg-yellow-500/10 px-1.5 py-0.5 text-[10px] text-yellow-700 dark:text-yellow-400">
                                    ⚠{" "}
                                    {email.issues
                                      .filter((i) => i.startsWith("MISSING_FIELD:"))
                                      .map((i) => `{${i.slice(14)}}`)
                                      .join(", ")}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="truncate text-muted-foreground">{email.subject}</div>
                            <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[email.status] || ""}`}>
                              {t(`review.status.${email.status}` as "review.status.draft")}
                            </span>
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              {(email.status === "draft" || email.status === "needs_review") && (
                                <button
                                  onClick={() => handleApprove(email)}
                                  disabled={approveEmail.isPending}
                                  title={t("review.approve")}
                                  className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                              )}
                              {email.status === "approved" && (
                                <button
                                  onClick={() => handleSend(email)}
                                  disabled={sending}
                                  title={t("review.send")}
                                  className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                                >
                                  <Send className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(email.id)}
                                title={confirmDeleteId === email.id ? t("review.deleteConfirm") : t("review.delete")}
                                className={`rounded-md p-1.5 transition-colors ${confirmDeleteId === email.id ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Expanded detail panel */}
                          {expandedId === email.id && (
                            <div className="border-t border-border bg-accent/10 px-6 py-5">
                              {email.issues.filter((i) => i.startsWith("MISSING_FIELD:")).length > 0 && (
                                <div className="mb-4 rounded border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-xs text-yellow-700 dark:text-yellow-400">
                                  ⚠ Mangler data:{" "}
                                  {email.issues
                                    .filter((i) => i.startsWith("MISSING_FIELD:"))
                                    .map((i) => `{${i.slice(14)}}`)
                                    .join(", ")}
                                </div>
                              )}
                              <div className="mb-4">
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("review.subject")}</label>
                                <input
                                  key={email.id + "-subject"}
                                  defaultValue={email.subject}
                                  onBlur={(e) => handleSubjectBlur(email, e.target.value)}
                                  className="w-full rounded-lg border border-border bg-accent/30 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>

                              <div className="mb-4">
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("review.body")}</label>
                                <div
                                  key={email.id + "-body"}
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => handleBodyBlur(email, e.currentTarget)}
                                  className="min-h-[200px] w-full rounded-lg border border-border bg-accent/30 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary whitespace-pre-wrap"
                                  dangerouslySetInnerHTML={{
                                    __html: DOMPurify.sanitize(
                                      /<[a-z][\s\S]*>/i.test(email.body) ? email.body : email.body.replace(/\n/g, "<br>")
                                    ),
                                  }}
                                />
                              </div>

                              {/* Action buttons */}
                              <div className="flex flex-wrap items-center gap-2">
                                {(email.status === "draft" || email.status === "needs_review") && (
                                  <>
                                    <button
                                      onClick={() => handleApprove(email)}
                                      disabled={approveEmail.isPending}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                                    >
                                      <CheckCircle className="h-4 w-4" /> {t("review.approve")}
                                    </button>
                                    <button
                                      onClick={() => handleApproveSend(email)}
                                      disabled={sending}
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                                    >
                                      <Send className="h-4 w-4" /> {sending ? t("review.sending") : t("review.approveSend")}
                                    </button>
                                  </>
                                )}
                                {email.status === "approved" && (
                                  <button
                                    onClick={() => handleSend(email)}
                                    disabled={sending}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                                  >
                                    <Send className="h-4 w-4" /> {sending ? t("review.sending") : t("review.send")}
                                  </button>
                                )}
                                {email.status !== "sent" && (
                                  <button
                                    onClick={() => handleSendTest(email)}
                                    disabled={sending}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
                                  >
                                    <FlaskConical className="h-4 w-4" /> {t("review.sendTest")}
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDelete(email.id)}
                                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${confirmDeleteId === email.id ? "bg-red-600 text-white hover:bg-red-700" : "border border-border bg-card text-foreground hover:bg-accent"}`}
                                >
                                  <Trash2 className="h-4 w-4" /> {confirmDeleteId === email.id ? t("review.deleteConfirm") : t("review.delete")}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default ReviewPage;
