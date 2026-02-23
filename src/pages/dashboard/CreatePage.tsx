import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Search, Sparkles, ChevronDown, Info } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useLeads } from "@/hooks/use-leads";
import { useProfile } from "@/hooks/use-profile";
import { useContactGroups, useGroupMemberships } from "@/hooks/use-contact-groups";
import { useGenerateEmails, type CreateMode } from "@/hooks/use-generate-emails";
import type { Email } from "@/types/database";
import { toast } from "sonner";

const tones = ["professional", "friendly", "direct"] as const;
const toneKeys = {
  professional: "onboarding.tone.professional",
  friendly: "onboarding.tone.friendly",
  direct: "onboarding.tone.direct",
} as const;

const goals = ["sales", "partnerships", "recruiting", "other"] as const;
const goalKeys = {
  sales: "onboarding.goal.sales",
  partnerships: "onboarding.goal.partnerships",
  recruiting: "onboarding.goal.recruiting",
  other: "onboarding.goal.other",
} as const;

const steps = ["step1", "step2", "step3"] as const;

const CreatePage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: leads = [], isLoading } = useLeads();
  const { data: profile } = useProfile();
  const { data: groups = [] } = useContactGroups();
  const { data: memberships = [] } = useGroupMemberships();
  const generateEmails = useGenerateEmails();

  const [step, setStep] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterGroupIds, setFilterGroupIds] = useState<Set<string>>(new Set());
  const [filterIndustries, setFilterIndustries] = useState<Set<string>>(new Set());
  const [showGroupFilter, setShowGroupFilter] = useState(false);
  const [showIndustryFilter, setShowIndustryFilter] = useState(false);
  const groupFilterRef = useRef<HTMLDivElement>(null);
  const industryFilterRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [tone, setTone] = useState<string>(profile?.tone || "professional");
  const [goal, setGoal] = useState<string>(profile?.goal || "sales");
  const [generatedEmails, setGeneratedEmails] = useState<Email[]>([]);

  // Sync tone and goal from profile once loaded
  useEffect(() => {
    if (profile?.tone) setTone(profile.tone);
    if (profile?.goal) setGoal(profile.goal);
  }, [profile?.tone, profile?.goal]);

  // Close filter dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (groupFilterRef.current && !groupFilterRef.current.contains(e.target as Node)) setShowGroupFilter(false);
      if (industryFilterRef.current && !industryFilterRef.current.contains(e.target as Node)) setShowIndustryFilter(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleFilterGroup = (id: string) => {
    setFilterGroupIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const toggleFilterIndustry = (ind: string) => {
    setFilterIndustries((prev) => { const next = new Set(prev); if (next.has(ind)) next.delete(ind); else next.add(ind); return next; });
  };
  // Standard mode
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateBody, setTemplateBody] = useState("Hei,\n\n");

  const uniqueIndustries = useMemo(() => {
    const industries = leads.map((l) => l.industry).filter((ind): ind is string => !!ind);
    return Array.from(new Set(industries)).sort();
  }, [leads]);

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (filterGroupIds.size > 0) {
      result = result.filter((l) => memberships.some((m) => m.contact_id === l.id && filterGroupIds.has(m.group_id)));
    }
    if (filterIndustries.size > 0) {
      result = result.filter((l) => l.industry != null && filterIndustries.has(l.industry));
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
  }, [leads, filterGroupIds, filterIndustries, search, memberships]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredLeads.forEach((l) => next.add(l.id));
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const canGenerate =
    campaignName.trim().length > 0 &&
    templateSubject.trim().length > 0 &&
    templateBody.trim().length > 0;

  const handleGenerate = async () => {
    try {
      const emails = await generateEmails.mutateAsync({
        contactIds: Array.from(selectedIds),
        mode: "hybrid",
        campaignName: campaignName.trim(),
        tone,
        goal,
        templateSubject,
        templateBody,
      });
      setGeneratedEmails(emails ?? []);
      setStep(2);
    } catch (e) {
      toast.error((e as Error).message ?? "Noe gikk galt. Prøv igjen.");
    }
  };

  const firstContact = leads.find((l) => selectedIds.has(l.id)) ?? null;

  const systemPromptText = [
    `Tone: ${tone}`,
    `Oppsøkingsmål: ${goal}`,
    `Kampanje: "${campaignName || "…"}"`,
    "",
    firstContact
      ? [
          `Eksempel – første mottaker (${selectedIds.size} totalt):`,
          `  Navn: ${firstContact.contact_name || "–"}`,
          `  Selskap: ${firstContact.company || "–"}`,
          `  Bransje: ${firstContact.industry || "–"}`,
          `  E-post: ${firstContact.contact_email || "–"}`,
        ].join("\n")
      : `Ingen mottakere valgt.`,
    "",
    `Tekst inni [...] erstattes av AI per mottaker. Tekst utenfor forblir uendret.`,
  ].join("\n");

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
              {/* Filters row */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {/* Group multi-select dropdown */}
                {groups.length > 0 && (
                  <div ref={groupFilterRef} className="relative">
                    <button
                      onClick={() => { setShowGroupFilter((v) => !v); setShowIndustryFilter(false); }}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${filterGroupIds.size > 0 ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:bg-accent"}`}
                    >
                      {t("contacts.col.groups")}
                      {filterGroupIds.size > 0 && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-foreground">{filterGroupIds.size}</span>}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    {showGroupFilter && (
                      <div className="absolute left-0 top-full z-20 mt-1 min-w-[200px] rounded-lg border border-border bg-card p-2 shadow-lg">
                        {groups.map((g) => (
                          <label key={g.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-foreground hover:bg-accent">
                            <input type="checkbox" checked={filterGroupIds.has(g.id)} onChange={() => toggleFilterGroup(g.id)} className="h-4 w-4 rounded border-border accent-primary" />
                            {g.name}
                          </label>
                        ))}
                        {filterGroupIds.size > 0 && (
                          <button onClick={() => setFilterGroupIds(new Set())} className="mt-1 w-full rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground">{t("contacts.filterAll")}</button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Industry multi-select dropdown */}
                {uniqueIndustries.length > 0 && (
                  <div ref={industryFilterRef} className="relative">
                    <button
                      onClick={() => { setShowIndustryFilter((v) => !v); setShowGroupFilter(false); }}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${filterIndustries.size > 0 ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:bg-accent"}`}
                    >
                      {t("contacts.col.industry")}
                      {filterIndustries.size > 0 && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-foreground">{filterIndustries.size}</span>}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    {showIndustryFilter && (
                      <div className="absolute left-0 top-full z-20 mt-1 min-w-[200px] rounded-lg border border-border bg-card p-2 shadow-lg">
                        {uniqueIndustries.map((ind) => (
                          <label key={ind} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-foreground hover:bg-accent">
                            <input type="checkbox" checked={filterIndustries.has(ind)} onChange={() => toggleFilterIndustry(ind)} className="h-4 w-4 rounded border-border accent-primary" />
                            {ind}
                          </label>
                        ))}
                        {filterIndustries.size > 0 && (
                          <button onClick={() => setFilterIndustries(new Set())} className="mt-1 w-full rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground">{t("contacts.filterAllIndustries")}</button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="relative flex-1 min-w-40">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("create.searchContacts")}
                    className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Actions row */}
              <div className="mb-3 flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">
                  {t("create.showing")} <span className="font-medium text-foreground">{filteredLeads.length}</span> {t("create.contacts")}
                  {selectedIds.size > 0 && (
                    <> · <span className="font-medium text-primary">{selectedIds.size}</span> {t("create.selectedCount")}</>
                  )}
                </span>
                <div className="ml-auto flex items-center gap-3">
                  <button
                    onClick={addAllFiltered}
                    disabled={filteredLeads.length === 0}
                    className="rounded-md bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-40"
                  >
                    {t("create.addAll")} ({filteredLeads.length})
                  </button>
                  {selectedIds.size > 0 && (
                    <button onClick={clearSelection} className="text-xs text-muted-foreground hover:text-foreground">
                      {t("create.clearSelection")}
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-80 space-y-1 overflow-y-auto">
                {filteredLeads.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    {t("create.noContacts")}
                  </div>
                ) : (
                  filteredLeads.map((lead) => (
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
                        {memberships
                          .filter((m) => m.contact_id === lead.id)
                          .map((m) => groups.find((g) => g.id === m.group_id))
                          .filter(Boolean)
                          .map((g) => (
                            <span key={g!.id} className="ml-1.5 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">{g!.name}</span>
                          ))}
                        {lead.industry && (
                          <span className="ml-1.5 rounded bg-accent px-1.5 py-0.5 text-xs text-muted-foreground">{lead.industry}</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{lead.contact_email}</span>
                    </label>
                  ))
                )}
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

      {/* Step 2: Write email */}
      {step === 1 && (
        <div className="rounded-xl border border-border bg-card p-6">
          {/* Campaign name */}
          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-semibold text-foreground">
              {t("create.campaignName")} <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder={t("create.campaignNamePlaceholder")}
              className="w-full rounded-lg border border-border bg-accent/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Goal selector */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-semibold text-foreground">{t("create.goal")}</label>
            <div className="flex flex-wrap gap-2">
              {goals.map((g) => (
                <button
                  key={g}
                  onClick={() => setGoal(g)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    goal === g
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border bg-accent text-foreground hover:border-primary/30"
                  }`}
                >
                  {t(goalKeys[g])}
                </button>
              ))}
            </div>
          </div>

          {/* Tone selector */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-semibold text-foreground">{t("create.tone")}</label>
            <div className="flex gap-2">
              {tones.map((t_) => (
                <button
                  key={t_}
                  onClick={() => setTone(t_)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    tone === t_
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border bg-accent text-foreground hover:border-primary/30"
                  }`}
                >
                  {t(toneKeys[t_])}
                </button>
              ))}
            </div>
          </div>

          {/* System prompt — read only, updates live with tone */}
          <div className="mb-6">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("create.systemPromptLabel")}</p>
            <div className="rounded-lg border border-border bg-accent/20 px-4 py-3 text-sm text-muted-foreground whitespace-pre-line select-none">
              {systemPromptText}
            </div>
          </div>

          {/* Hybrid hint */}
          <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="text-sm">
              <p className="font-semibold text-foreground">{t("create.hybridHint")}</p>
              <p className="mt-0.5 text-muted-foreground">{t("create.hybridHintDetail")}</p>
            </div>
          </div>

          {/* Subject */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-semibold text-foreground">
              {t("create.templateSubject")} <span className="text-destructive">*</span>
            </label>
            <p className="mb-2 text-xs text-muted-foreground">{t("create.hybridSubjectTip")}</p>
            <input
              type="text"
              value={templateSubject}
              onChange={(e) => setTemplateSubject(e.target.value)}
              placeholder={t("create.hybridSubjectExample")}
              className="w-full rounded-lg border border-border bg-accent/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Body */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground">{t("create.templateBody")}</label>
            <p className="mb-2 text-xs text-muted-foreground">{t("create.hybridBodyTip")}</p>
            <textarea
              value={templateBody}
              onChange={(e) => setTemplateBody(e.target.value)}
              rows={10}
              className="w-full rounded-b-none rounded-t-lg border border-b-0 border-border bg-accent/30 px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {profile?.email_signature && (
              <div className="rounded-b-lg border border-border bg-accent/10 px-4 py-3">
                <div
                  className="text-sm text-muted-foreground [&_*]:max-w-full"
                  dangerouslySetInnerHTML={{ __html: profile.email_signature }}
                />
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setStep(0)}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> {t("create.back")}
            </button>
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || generateEmails.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {generateEmails.isPending ? t("create.generating") : t("create.generate")}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview drafts */}
      {step === 2 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="mb-5 text-sm text-muted-foreground">{t("create.previewDesc")}</p>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {generatedEmails.map((email) => (
              <div key={email.id} className="rounded-lg border border-border bg-background p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-foreground">{email.contact_name || email.contact_email}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{email.company}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{email.contact_email}</span>
                </div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("review.subject")}
                </p>
                <p className="mb-3 text-sm font-medium text-foreground">{email.subject}</p>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("review.body")}
                </p>
                <p className="whitespace-pre-line text-sm text-foreground line-clamp-4">{email.body}</p>
                {profile?.email_signature && (
                  <div className="mt-3">
                    <div
                      className="text-sm text-muted-foreground [&_*]:max-w-full"
                      dangerouslySetInnerHTML={{ __html: profile.email_signature }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> {t("create.back")}
            </button>
            <button
              onClick={() => navigate("/dashboard/review")}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t("create.goToReview")} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePage;
