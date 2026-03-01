import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useNavigationGuard } from "@/contexts/NavigationGuardContext";
import { ArrowLeft, ArrowRight, Search, Sparkles, ChevronDown, Info } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useLeads } from "@/hooks/use-leads";
import { useProfile } from "@/hooks/use-profile";
import { useContactGroups, useGroupMemberships } from "@/hooks/use-contact-groups";
import { useGenerateEmails, type CreateMode } from "@/hooks/use-generate-emails";
import { useEmailTemplates, useCreateEmailTemplate, useDeleteEmailTemplate } from "@/hooks/use-email-templates";
import { useSentEmailCounts } from "@/hooks/use-emails";
import { useCampaignDrafts, useCreateCampaignDraft, useUpdateCampaignDraft } from "@/hooks/use-campaign-drafts";
import type { Email } from "@/types/database";
import { toast } from "sonner";
import RichEmailEditor from "@/components/RichEmailEditor";

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

const campaignLanguages = [
  { code: "no", label: "Norsk" },
  { code: "en", label: "Engelsk" },
  { code: "sv", label: "Svensk" },
  { code: "da", label: "Dansk" },
] as const;

const steps = ["step1", "step2", "step3"] as const;

const FIELD_MAP: Record<string, string> = {
  contact_name: "contact_name",
  company: "company",
  domene: "domain",
  industry: "industry",
  contact_email: "contact_email",
};

const CreatePage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const draftId = searchParams.get("draft");
  const { data: leads = [], isLoading } = useLeads();
  const { data: profile } = useProfile();
  const { data: groups = [] } = useContactGroups();
  const { data: memberships = [] } = useGroupMemberships();
  const generateEmails = useGenerateEmails();
  const { data: templates = [] } = useEmailTemplates();
  const { data: sentCounts = new Map() } = useSentEmailCounts();
  const createTemplate = useCreateEmailTemplate();
  const deleteTemplate = useDeleteEmailTemplate();
  const { data: drafts = [] } = useCampaignDrafts();
  const createDraft = useCreateCampaignDraft();
  const updateDraft = useUpdateCampaignDraft();

  const [step, setStep] = useState(0);
  const [savingTpl, setSavingTpl] = useState(false);
  const [tplNameInput, setTplNameInput] = useState("");
  const [showTplSave, setShowTplSave] = useState(false);
  const [confirmDeleteTplId, setConfirmDeleteTplId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterGroupIds, setFilterGroupIds] = useState<Set<string>>(new Set());
  const [filterIndustries, setFilterIndustries] = useState<Set<string>>(new Set());
  const [empMin, setEmpMin] = useState<string>("");
  const [empMax, setEmpMax] = useState<string>("");
  const [showGroupFilter, setShowGroupFilter] = useState(false);
  const [showIndustryFilter, setShowIndustryFilter] = useState(false);
  const groupFilterRef = useRef<HTMLDivElement>(null);
  const industryFilterRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [tone, setTone] = useState<string>(profile?.tone || "professional");
  const [goal, setGoal] = useState<string>(profile?.goal || "sales");
  const [campaignLanguage, setCampaignLanguage] = useState("no");
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

  // Draft: load state from URL param on first render
  const draftInitialized = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!draftId || draftInitialized.current || drafts.length === 0) return;
    const draft = drafts.find((d) => d.id === draftId);
    if (!draft) return;
    draftInitialized.current = true;
    if (draft.name && draft.name !== "Uten navn") setCampaignName(draft.name);
    if (draft.contact_ids.length > 0) setSelectedIds(new Set(draft.contact_ids));
    if (draft.tone) setTone(draft.tone);
    if (draft.goal) setGoal(draft.goal);
    if (draft.language) setCampaignLanguage(draft.language);
    if (draft.template_subject) setTemplateSubject(draft.template_subject);
    if (draft.template_body) {
      const body = draft.template_body.includes("<") ? draft.template_body : draft.template_body.replace(/\n/g, "<br>");
      setTemplateBody(body);
      setTemplateKey((k) => k + 1);
    }
  }, [draftId, drafts]);

  // Standard mode — declared here so the auto-save useEffect below can reference them
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateBody, setTemplateBody] = useState("<p>Hei,</p><p><br></p>");
  const [templateKey, setTemplateKey] = useState(0);

  // Draft: auto-save on state changes (debounced)
  const selectedIdsStr = useMemo(() => Array.from(selectedIds).sort().join(","), [selectedIds]);

  useEffect(() => {
    if (!draftId || !draftInitialized.current) return;
    const ids = Array.from(selectedIds);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      updateDraft.mutate({
        id: draftId,
        name: campaignName.trim() || "Uten navn",
        contact_ids: ids,
        tone,
        goal,
        language: campaignLanguage,
        template_subject: templateSubject,
        template_body: templateBody,
      });
    }, 1500);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, campaignName, selectedIdsStr, tone, goal, campaignLanguage, templateSubject, templateBody]);

  const toggleFilterGroup = (id: string) => {
    setFilterGroupIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const toggleFilterIndustry = (ind: string) => {
    setFilterIndustries((prev) => { const next = new Set(prev); if (next.has(ind)) next.delete(ind); else next.add(ind); return next; });
  };

  const uniqueIndustries = useMemo(() => {
    const industries = leads.map((l) => l.industry).filter((ind): ind is string => !!ind);
    return Array.from(new Set(industries)).sort();
  }, [leads]);

  const missingFieldWarnings = useMemo(() => {
    const vars = [...templateBody.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    if (!vars.length) return [];
    const warnings: string[] = [];
    for (const v of vars) {
      const field = FIELD_MAP[v];
      if (!field) continue;
      const missing = Array.from(selectedIds).filter((id) => {
        const lead = leads.find((l) => l.id === id);
        return !lead?.[field as keyof typeof lead];
      }).length;
      if (missing > 0) warnings.push(`${missing} kontakt${missing > 1 ? "er" : ""} mangler {${v}}`);
    }
    return warnings;
  }, [templateBody, selectedIds, leads]);

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
    const min = empMin !== "" ? parseInt(empMin) : null;
    const max = empMax !== "" ? parseInt(empMax) : null;
    if (min !== null || max !== null) {
      result = result.filter((l) => {
        const ec = l.employee_count;
        if (ec == null) return false;
        if (min !== null && ec < min) return false;
        if (max !== null && ec > max) return false;
        return true;
      });
    }
    return result;
  }, [leads, filterGroupIds, filterIndustries, search, memberships, empMin, empMax]);

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

  const bodyText = templateBody.replace(/<[^>]*>/g, "").trim();
  const canGenerate =
    campaignName.trim().length > 0 &&
    templateSubject.trim().length > 0 &&
    bodyText.length > 0;

  const handleGenerate = async () => {
    try {
      const emails = await generateEmails.mutateAsync({
        contactIds: Array.from(selectedIds),
        mode: "hybrid",
        campaignName: campaignName.trim(),
        tone,
        goal,
        language: campaignLanguage,
        templateSubject,
        templateBody,
      });
      setGeneratedEmails(emails ?? []);
      setStep(2);
    } catch (e) {
      toast.error((e as Error).message ?? "Noe gikk galt. Prøv igjen.");
    }
  };

  // Show leave prompt whenever the user is on step 1+ with contacts selected
  const shouldPromptOnLeave = step >= 1 && selectedIds.size > 0;

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveNameInput, setLeaveNameInput] = useState("");
  const [savingOnLeave, setSavingOnLeave] = useState(false);
  const pendingNavigateRef = useRef<string | null>(null);

  // Warn on browser close / hard navigation while in flow
  useEffect(() => {
    if (!shouldPromptOnLeave) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [shouldPromptOnLeave]);

  const handleNavigateAway = (to: string) => {
    if (shouldPromptOnLeave) {
      pendingNavigateRef.current = to;
      setLeaveNameInput(campaignName);
      setShowLeaveModal(true);
    } else {
      navigate(to);
    }
  };

  // Register guard with sidebar so clicking any nav item also triggers the prompt
  const { setGuard } = useNavigationGuard();
  const handleNavigateAwayRef = useRef(handleNavigateAway);
  handleNavigateAwayRef.current = handleNavigateAway;
  useEffect(() => {
    if (shouldPromptOnLeave) {
      setGuard((to) => handleNavigateAwayRef.current(to));
    } else {
      setGuard(null);
    }
    return () => setGuard(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPromptOnLeave]);

  // Auto-create draft when campaign name is first entered (lazy creation)
  const draftCreateCalled = useRef(false);
  useEffect(() => {
    if (draftId || draftCreateCalled.current || step < 1 || !campaignName.trim()) return;
    draftCreateCalled.current = true;
    const ids = Array.from(selectedIds);
    createDraft.mutateAsync({
      name: campaignName.trim(),
      contact_ids: ids,
      tone,
      goal,
      language: campaignLanguage,
      template_subject: templateSubject,
      template_body: templateBody,
    }).then((draft) => {
      draftInitialized.current = true;
      setSearchParams({ draft: draft.id }, { replace: true });
    }).catch(() => {
      draftCreateCalled.current = false;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, step, campaignName]);

  const handleSaveOnLeave = async () => {
    if (!leaveNameInput.trim()) return;
    setSavingOnLeave(true);
    try {
      await createDraft.mutateAsync({
        name: leaveNameInput.trim(),
        contact_ids: Array.from(selectedIds),
        tone,
        goal,
        language: campaignLanguage,
        template_subject: templateSubject,
        template_body: templateBody,
      });
      setShowLeaveModal(false);
      navigate(pendingNavigateRef.current ?? "/dashboard/campaigns");
    } catch {
      toast.error("Kunne ikke lagre kampanje");
      setSavingOnLeave(false);
    }
  };

  const handleDiscardAndLeave = () => {
    setShowLeaveModal(false);
    navigate(pendingNavigateRef.current ?? "/dashboard/campaigns");
  };

  const handleNextFromStep0 = () => {
    setStep(1);
  };

  const firstContact = leads.find((l) => selectedIds.has(l.id)) ?? null;

  const toneLabel = t(toneKeys[tone as keyof typeof toneKeys] || "onboarding.tone.professional");
  const goalLabel = t(goalKeys[goal as keyof typeof goalKeys] || "onboarding.goal.sales");
  const languageLabel = campaignLanguages.find((l) => l.code === campaignLanguage)?.label ?? campaignLanguage;

  const systemPromptText = [
    `Tone: ${toneLabel}`,
    `Oppsøkingsmål: ${goalLabel}`,
    `Kampanjespråk: ${languageLabel}`,
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

  const loadTemplate = (tpl: (typeof templates)[0]) => {
    setTemplateSubject(tpl.subject);
    const body = tpl.body.includes("<") ? tpl.body : tpl.body.replace(/\n/g, "<br>");
    setTemplateBody(body);
    setTemplateKey((k) => k + 1);
    setCampaignLanguage(tpl.language);
    toast.success(t("create.tpl.loaded"));
  };

  const handleSaveTemplate = async () => {
    if (!tplNameInput.trim()) return;
    setSavingTpl(true);
    try {
      await createTemplate.mutateAsync({ name: tplNameInput.trim(), subject: templateSubject, body: templateBody, language: campaignLanguage });
      setTplNameInput("");
      setShowTplSave(false);
      toast.success(t("create.tpl.saved"));
    } finally {
      setSavingTpl(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            {(draftId || step >= 1) && (
              <button
                onClick={() => handleNavigateAway("/dashboard/campaigns")}
                className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3 w-3" /> Tilbake til kampanjer
              </button>
            )}
            <h1 className="font-heading text-2xl font-bold text-foreground">{t("create.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("create.desc")}</p>
          </div>
          {draftId && updateDraft.isPending && (
            <span className="text-xs text-muted-foreground">Lagrer…</span>
          )}
        </div>
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

                {/* Employee count range filter */}
                <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-sm">
                  <span className="text-xs font-medium text-muted-foreground">Ansatte</span>
                  <input type="number" min="0" value={empMin} onChange={(e) => setEmpMin(e.target.value)} placeholder="Fra" className="w-14 rounded border border-border bg-accent/30 px-1.5 py-0.5 text-xs text-foreground focus:border-primary focus:outline-none" />
                  <span className="text-xs text-muted-foreground">–</span>
                  <input type="number" min="0" value={empMax} onChange={(e) => setEmpMax(e.target.value)} placeholder="Til" className="w-14 rounded border border-border bg-accent/30 px-1.5 py-0.5 text-xs text-foreground focus:border-primary focus:outline-none" />
                </div>

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
                        {lead.employee_count != null && (
                          <span className="ml-1.5 rounded bg-accent px-1.5 py-0.5 text-xs text-muted-foreground">{lead.employee_count} ansatte</span>
                        )}
                        {(sentCounts.get(lead.contact_email.toLowerCase()) ?? 0) > 0 && (
                          <span className="ml-1.5 inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                            Sent <span className="rounded-full bg-green-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{sentCounts.get(lead.contact_email.toLowerCase())}</span>
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{lead.contact_email}</span>
                    </label>
                  ))
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleNextFromStep0}
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

          {/* Language selector */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-semibold text-foreground">{t("create.campaignLanguage")}</label>
            <div className="flex gap-2">
              {campaignLanguages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setCampaignLanguage(l.code)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    campaignLanguage === l.code
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border bg-accent text-foreground hover:border-primary/30"
                  }`}
                >
                  {l.label}
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

          {/* Use template */}
          {templates.length > 0 && (
            <div className="mb-5">
              <label className="mb-2 block text-sm font-semibold text-foreground">Bruk mal</label>
              <div className="flex flex-wrap gap-2">
                {templates.map((tpl) => (
                  <div key={tpl.id} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${confirmDeleteTplId === tpl.id ? "border-destructive/40 bg-destructive/10" : "border-border bg-accent text-foreground"}`}>
                    <button onClick={() => { setConfirmDeleteTplId(null); loadTemplate(tpl); }} className="text-foreground">{tpl.name}</button>
                    <button
                      onClick={() => {
                        if (confirmDeleteTplId === tpl.id) {
                          deleteTemplate.mutate(tpl.id);
                          toast.success(t("create.tpl.deleted"));
                          setConfirmDeleteTplId(null);
                        } else {
                          setConfirmDeleteTplId(tpl.id);
                        }
                      }}
                      className={`ml-1 text-xs transition-colors ${confirmDeleteTplId === tpl.id ? "font-semibold text-destructive" : "text-muted-foreground hover:text-destructive"}`}
                      title={confirmDeleteTplId === tpl.id ? "Klikk igjen for å bekrefte sletting" : "Slett mal"}
                    >
                      {confirmDeleteTplId === tpl.id ? "Slett?" : "×"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

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
            <RichEmailEditor
              key={templateKey}
              value={templateBody}
              onChange={setTemplateBody}
              defaultFontFamily={profile?.font_family || "Arial"}
              placeholder={t("create.hybridBodyTip")}
            />
            {profile?.email_signature && (
              <p className="mt-1.5 text-center text-xs text-muted-foreground">— signatur sendes med i e-post —</p>
            )}
          </div>

          {/* Save as template */}
          <div className="mt-4 rounded-lg border border-dashed border-border p-4">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Lagre emne og e-postinnhold som mal</p>
            {!showTplSave ? (
              <button
                onClick={() => setShowTplSave(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary"
              >
                + {t("create.tpl.save")}
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={tplNameInput}
                  onChange={(e) => setTplNameInput(e.target.value)}
                  placeholder={t("create.tpl.namePlaceholder")}
                  className="rounded-lg border border-border bg-accent/30 px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                  onKeyDown={(e) => e.key === "Escape" && setShowTplSave(false)}
                />
                <button
                  onClick={handleSaveTemplate}
                  disabled={savingTpl || !tplNameInput.trim() || (!templateSubject && !bodyText)}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {savingTpl ? t("create.tpl.saving") : t("create.tpl.confirm")}
                </button>
                <button onClick={() => setShowTplSave(false)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
              </div>
            )}
          </div>

          {missingFieldWarnings.length > 0 && (
            <div className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-xs text-yellow-700 dark:text-yellow-400">
              ⚠ {missingFieldWarnings.join(" · ")}
            </div>
          )}

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
                <div
                  className="text-sm text-foreground [&_*]:max-w-full"
                  dangerouslySetInnerHTML={{ __html: email.body }}
                />
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
      {/* Leave without saving — prompt */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            {draftId ? (
              // Draft already saved — just confirm leaving
              <>
                <h2 className="mb-1 text-base font-bold text-foreground">Forlate kampanje?</h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  Kampanjen er lagret og du kan fortsette den fra Kampanjer.
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleDiscardAndLeave}
                    className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Forlat
                  </button>
                  <button
                    onClick={() => setShowLeaveModal(false)}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Avbryt
                  </button>
                </div>
              </>
            ) : (
              // No draft yet — prompt to name and save or discard
              <>
                <h2 className="mb-1 text-base font-bold text-foreground">Lagre kampanje?</h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  Vil du lagre denne kampanjen før du forlater? Gi den et navn for å lagre.
                </p>
                <input
                  type="text"
                  value={leaveNameInput}
                  onChange={(e) => setLeaveNameInput(e.target.value)}
                  placeholder="Kampanjenavn"
                  autoFocus
                  className="mb-4 w-full rounded-lg border border-border bg-accent/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  onKeyDown={(e) => e.key === "Enter" && handleSaveOnLeave()}
                />
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleSaveOnLeave}
                    disabled={!leaveNameInput.trim() || savingOnLeave}
                    className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    {savingOnLeave ? "Lagrer…" : "Lagre og forlat"}
                  </button>
                  <button
                    onClick={handleDiscardAndLeave}
                    className="w-full rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    Forkast og forlat
                  </button>
                  <button
                    onClick={() => setShowLeaveModal(false)}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Avbryt
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePage;
