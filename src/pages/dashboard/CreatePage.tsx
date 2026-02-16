import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Search, Sparkles, FileText } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useLeads } from "@/hooks/use-leads";
import { useContactGroups, useGroupMemberships } from "@/hooks/use-contact-groups";
import { useGenerateEmails, type CreateMode } from "@/hooks/use-generate-emails";

const steps = ["step1", "step2", "step3"] as const;

const CreatePage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: leads = [], isLoading } = useLeads();
  const { data: groups = [] } = useContactGroups();
  const { data: memberships = [] } = useGroupMemberships();
  const generateEmails = useGenerateEmails();

  const [step, setStep] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterGroupId, setFilterGroupId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<CreateMode>("standard");
  const [campaignName, setCampaignName] = useState("");
  // AI mode
  const [instructions, setInstructions] = useState("");
  // Standard mode
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateBody, setTemplateBody] = useState("");

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (filterGroupId) {
      const groupContactIds = memberships.filter((m) => m.group_id === filterGroupId).map((m) => m.contact_id);
      result = result.filter((l) => groupContactIds.includes(l.id));
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.company.toLowerCase().includes(q) ||
          l.contact_email.toLowerCase().includes(q) ||
          (l.contact_name || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [leads, filterGroupId, search, memberships]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredLeads.map((l) => l.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const canGenerate =
    mode === "ai"
      ? instructions.trim().length > 0
      : templateSubject.trim().length > 0 && templateBody.trim().length > 0;

  const handleGenerate = async () => {
    const contactIds = Array.from(selectedIds);
    await generateEmails.mutateAsync({
      contactIds,
      contacts: leads,
      mode,
      campaignName: campaignName.trim() || `Campaign ${new Date().toLocaleDateString()}`,
      instructions: mode === "ai" ? instructions : undefined,
      templateSubject: mode === "standard" ? templateSubject : undefined,
      templateBody: mode === "standard" ? templateBody : undefined,
    });
    navigate("/dashboard/review");
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">{t("create.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("create.desc")}</p>
      </div>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-3">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                i <= step
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            <span className={`text-sm font-medium ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>
              {t(`create.${s}` as "create.step1")}
            </span>
            {i < steps.length - 1 && <div className="mx-2 h-px w-8 bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 1: Select recipients */}
      {step === 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : leads.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {t("create.noContacts")}
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <select
                  value={filterGroupId}
                  onChange={(e) => setFilterGroupId(e.target.value)}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                >
                  <option value="">{t("create.allContacts")}</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>

                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("create.searchContacts")}
                    className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} {t("create.selectedCount")}
                </span>

                <button onClick={selectAll} className="text-sm text-primary hover:underline">{t("create.selectAll")}</button>
                <button onClick={deselectAll} className="text-sm text-muted-foreground hover:underline">{t("create.deselectAll")}</button>
              </div>

              <div className="max-h-80 space-y-1 overflow-y-auto">
                {filteredLeads.map((lead) => (
                  <label
                    key={lead.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                      selectedIds.has(lead.id) ? "bg-primary/5" : "hover:bg-accent/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(lead.id)}
                      onChange={() => toggleSelect(lead.id)}
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-foreground">{lead.contact_name || lead.contact_email}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{lead.company}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{lead.contact_email}</span>
                  </label>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setStep(1)}
                  disabled={selectedIds.size === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
                >
                  {t("create.next")} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 2: Choose mode */}
      {step === 1 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 font-heading text-base font-semibold text-foreground">{t("create.modeTitle")}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              onClick={() => setMode("standard")}
              className={`flex flex-col items-start gap-2 rounded-xl border-2 p-5 text-left transition-colors ${
                mode === "standard"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <FileText className={`h-6 w-6 ${mode === "standard" ? "text-primary" : "text-muted-foreground"}`} />
              <span className="font-heading text-sm font-semibold text-foreground">{t("create.modeStandard")}</span>
              <span className="text-xs text-muted-foreground">{t("create.modeStandardDesc")}</span>
            </button>
            <button
              onClick={() => setMode("ai")}
              className={`flex flex-col items-start gap-2 rounded-xl border-2 p-5 text-left transition-colors ${
                mode === "ai"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <Sparkles className={`h-6 w-6 ${mode === "ai" ? "text-primary" : "text-muted-foreground"}`} />
              <span className="font-heading text-sm font-semibold text-foreground">{t("create.modeAi")}</span>
              <span className="text-xs text-muted-foreground">{t("create.modeAiDesc")}</span>
            </button>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setStep(0)}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> {t("create.back")}
            </button>
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t("create.next")} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Write content + generate */}
      {step === 2 && (
        <div className="rounded-xl border border-border bg-card p-6">
          {/* Campaign name */}
          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-semibold text-foreground">{t("create.campaignName")}</label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder={t("create.campaignNamePlaceholder")}
              className="w-full rounded-lg border border-border bg-accent/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {mode === "ai" ? (
            <>
              <h3 className="mb-2 font-heading text-base font-semibold text-foreground">{t("create.instructions")}</h3>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={8}
                placeholder={t("create.instructionsPlaceholder")}
                className="w-full rounded-lg border border-border bg-accent/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </>
          ) : (
            <>
              <div className="mb-4">
                <label className="mb-1.5 block text-sm font-semibold text-foreground">{t("create.templateSubject")}</label>
                <input
                  type="text"
                  value={templateSubject}
                  onChange={(e) => setTemplateSubject(e.target.value)}
                  placeholder={t("create.templateSubjectPlaceholder")}
                  className="w-full rounded-lg border border-border bg-accent/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">{t("create.templateBody")}</label>
                <textarea
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  rows={8}
                  placeholder={t("create.templateBodyPlaceholder")}
                  className="w-full rounded-lg border border-border bg-accent/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </>
          )}

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> {t("create.back")}
            </button>
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || generateEmails.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {mode === "ai" ? <Sparkles className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              {generateEmails.isPending ? t("create.generating") : t("create.generate")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePage;
