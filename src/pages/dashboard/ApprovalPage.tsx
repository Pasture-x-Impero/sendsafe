import { useState } from "react";
import { Check, RefreshCw, Pencil, Send, AlertTriangle, ShieldCheck } from "lucide-react";

const emails = [
  {
    id: 1,
    company: "Acme Corp",
    contact: "Sarah Chen",
    subject: "Partnership opportunity with Acme Corp",
    body: `Hi Sarah,

I came across Acme Corp's recent expansion into cloud infrastructure and wanted to reach out about a potential collaboration.

We help companies like yours streamline their outbound communication with AI-verified messaging, ensuring every touchpoint is accurate and professional.

Would you be open to a quick 15-minute call this week?

Best regards`,
    approved: true,
    confidence: 94,
    issues: [],
    suggestions: "Email looks good. Consider adding a specific value proposition.",
  },
  {
    id: 2,
    company: "Globex Inc",
    contact: "John Smith",
    subject: "Streamline your outbound with AI",
    body: `Hi John,

I noticed Globex recently raised their Series B and are scaling rapidly. Congratulations!

As you grow your sales team, outbound quality becomes critical. DraftGuard helps teams like yours maintain email quality at scale with AI-powered review.

Would love to show you how we can help. Free to chat this week?

Cheers`,
    approved: false,
    confidence: 72,
    issues: [
      "Could not verify Series B funding claim",
      "Subject line may trigger spam filters",
    ],
    suggestions: "Remove unverified funding claim. Rephrase subject to be more specific.",
  },
];

const ApprovalPage = () => {
  const [selected, setSelected] = useState(0);
  const email = emails[selected];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">Approval Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review and approve emails before sending.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
        {/* Email list + preview */}
        <div className="space-y-4">
          {/* Email selector tabs */}
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
                <div className="text-xs text-muted-foreground">{e.contact}</div>
              </button>
            ))}
          </div>

          {/* Email preview */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Email Preview</div>
            <h3 className="font-heading text-lg font-semibold text-foreground">{email.subject}</h3>
            <div className="mt-1 text-xs text-muted-foreground">To: {email.contact}</div>
            <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {email.body}
            </div>
          </div>
        </div>

        {/* Review panel */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">AI Review</div>

          {/* Status */}
          <div className="mb-6 flex items-center gap-3">
            {email.approved ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-sm font-semibold text-success">
                <ShieldCheck className="h-4 w-4" /> Approved
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1.5 text-sm font-semibold text-warning">
                <AlertTriangle className="h-4 w-4" /> Issues Found
              </span>
            )}
            <span className="text-sm text-muted-foreground">
              Confidence: <strong className="text-foreground">{email.confidence}/100</strong>
            </span>
          </div>

          {/* Issues */}
          {email.issues.length > 0 && (
            <div className="mb-6">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Issues</div>
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
              {["No hallucinated claims detected", "Personalization verified", "Tone: Professional ✓"].map((check) => (
                <div key={check} className="flex items-start gap-2 rounded-lg bg-success/5 p-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span className="text-sm text-muted-foreground">{check}</span>
                </div>
              ))}
            </div>
          )}

          {/* Suggestions */}
          <div className="mb-6">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Suggestion</div>
            <p className="text-sm text-muted-foreground">{email.suggestions}</p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
              <Send className="h-4 w-4" /> Approve & send
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent">
              <RefreshCw className="h-4 w-4" /> Regenerate
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent">
              <Pencil className="h-4 w-4" /> Edit manually
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalPage;
