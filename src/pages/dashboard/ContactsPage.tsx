import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Upload, Download, Trash2, Plus, X, Users, Pencil, Check, ChevronUp, ChevronDown, ChevronsUpDown, Sparkles } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useLeads, useImportLeads, useUpdateLead, useDeleteLead } from "@/hooks/use-leads";
import {
  useContactGroups,
  useCreateContactGroup,
  useDeleteContactGroup,
  useGroupMemberships,
  useAddToGroup,
} from "@/hooks/use-contact-groups";
import { useEnrichContacts } from "@/hooks/use-enrich-contacts";
import { toast } from "sonner";
import type { Lead } from "@/types/database";

type SortField = "domain" | "company" | "contact_email" | "contact_name" | "industry";
type SortDir = "asc" | "desc";
type PendingRow = { domain: string | null; company: string; contact_email: string; contact_name: string | null; industry: string | null; comment: string | null; groupNames: string[] };
type ManualRow = { company: string; contact_email: string; contact_name: string; industry: string; groupId: string };
const emptyManualRow = (): ManualRow => ({ company: "", contact_email: "", contact_name: "", industry: "", groupId: "" });

const ContactsPage = () => {
  const { t } = useLanguage();
  const { data: leads = [], isLoading } = useLeads();
  const importLeads = useImportLeads();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const { data: groups = [] } = useContactGroups();
  const createGroup = useCreateContactGroup();
  const deleteGroup = useDeleteContactGroup();
  const { data: memberships = [] } = useGroupMemberships();
  const addToGroup = useAddToGroup();
  const enrichContacts = useEnrichContacts();

  const [tab, setTab] = useState<"file" | "manual">("file");
  const [manualRows, setManualRows] = useState<ManualRow[]>([emptyManualRow()]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterGroupIds, setFilterGroupIds] = useState<Set<string>>(new Set());
  const [filterIndustries, setFilterIndustries] = useState<Set<string>>(new Set());
  const [showGroupFilter, setShowGroupFilter] = useState(false);
  const [showIndustryFilter, setShowIndustryFilter] = useState(false);
  const groupFilterRef = useRef<HTMLDivElement>(null);
  const industryFilterRef = useRef<HTMLDivElement>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [showAddToGroup, setShowAddToGroup] = useState(false);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [importStats, setImportStats] = useState<{ imported: number; skipped: number } | null>(null);
  const [pendingRows, setPendingRows] = useState<PendingRow[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Unique industries for filter
  const industries = useMemo(() => {
    const set = new Set(leads.map((l) => l.industry).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [leads]);

  // Close dropdowns on click outside
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

  // Filter
  const filtered = useMemo(() => {
    let result = leads;
    if (filterGroupIds.size > 0) {
      result = result.filter((lead) => memberships.some((m) => m.contact_id === lead.id && filterGroupIds.has(m.group_id)));
    }
    if (filterIndustries.size > 0) {
      result = result.filter((lead) => lead.industry != null && filterIndustries.has(lead.industry));
    }
    return result;
  }, [leads, filterGroupIds, filterIndustries, memberships]);

  // Sort
  const sortedLeads = useMemo(() => {
    if (!sortField) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = (a[sortField] || "").toLowerCase();
      const bVal = (b[sortField] || "").toLowerCase();
      const cmp = aVal.localeCompare(bVal);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  const getGroupsForContact = (contactId: string) => {
    const groupIds = memberships.filter((m) => m.contact_id === contactId).map((m) => m.group_id);
    return groups.filter((g) => groupIds.includes(g.id));
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortField(null); setSortDir("asc"); }
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
    return sortDir === "asc"
      ? <ChevronUp className="ml-1 inline h-3 w-3" />
      : <ChevronDown className="ml-1 inline h-3 w-3" />;
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedLeads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedLeads.map((l) => l.id)));
    }
  };

  // Parse groups string like "(Kunde;Lead)" → ["Kunde", "Lead"]
  const parseGroups = (raw: string | undefined | null): string[] => {
    if (!raw) return [];
    const match = raw.match(/\(([^)]+)\)/);
    if (!match) return [];
    return match[1].split(";").map((g) => g.trim()).filter(Boolean);
  };

  // Parse {(groups), "comment"} format → { groups, comment }
  const parseGroupsAndComment = (raw: string | undefined | null): { groups: string[]; comment: string | null } => {
    if (!raw) return { groups: [], comment: null };
    const braceMatch = raw.match(/\{([^}]*)\}/);
    if (braceMatch) {
      const inner = braceMatch[1];
      const groups = parseGroups(inner);
      const commentMatch = inner.match(/"([^"]*)"/);
      return { groups, comment: commentMatch ? commentMatch[1] : null };
    }
    return { groups: parseGroups(raw), comment: null };
  };

  // Confirm and run the pending file import
  const confirmImport = async () => {
    if (!pendingRows) return;
    try {
      const toImport = pendingRows.map((r) => ({ domain: r.domain, company: r.company, contact_email: r.contact_email, contact_name: r.contact_name, industry: r.industry, comment: r.comment, status: "imported" as const }));
      const result = await importLeads.mutateAsync(toImport);
      // Build a local group cache seeded from current groups to avoid duplicates
      const groupCache = new Map(groups.map((g) => [g.name.toLowerCase(), g]));
      for (let i = 0; i < result.length; i++) {
        for (const name of pendingRows[i].groupNames) {
          const key = name.toLowerCase();
          let group = groupCache.get(key);
          if (!group) {
            const created = await createGroup.mutateAsync(name);
            groupCache.set(key, created);
            group = created;
          }
          if (group) await addToGroup.mutateAsync({ contactIds: [result[i].id], groupId: group.id });
        }
      }
      setImportStats({ imported: result.length, skipped: pendingRows.length - result.length });
      setPendingRows(null);
      if (tab === "manual") setManualRows([emptyManualRow()]);
    } catch {
      toast.error("Failed to import contacts");
    }
  };

  const downloadTemplate = useCallback(async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([
      [t("contacts.col.domain"), t("contacts.col.company"), t("contacts.col.email"), t("contacts.col.name"), t("contacts.col.industry"), t("contacts.col.groups"), t("contacts.col.comment")],
      ["acme.no", "Acme AS", "ola@acme.no", "Ola Nordmann", "Teknologi", "(Kunde;Lead)", "Møtt på konferanse"],
      ["globex.no", "Globex AS", "kari@globex.no", "Kari Hansen", "Finans", "(Partner)", "Følg opp Q2"],
    ]);
    ws["!cols"] = [{ wch: 18 }, { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 25 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contacts");
    XLSX.writeFile(wb, "sendsafe_contacts_template.xlsx");
  }, [t]);

  const exportContacts = useCallback(async () => {
    const XLSX = await import("xlsx");
    const rows = sortedLeads.map((lead) => {
      const contactGroups = getGroupsForContact(lead.id);
      const groupStr = contactGroups.length > 0 ? `(${contactGroups.map((g) => g.name).join(";")})` : "";
      return [lead.domain || "", lead.company, lead.contact_email, lead.contact_name || "", lead.industry || "", groupStr, lead.comment || ""];
    });
    const ws = XLSX.utils.aoa_to_sheet([
      [t("contacts.col.domain"), t("contacts.col.company"), t("contacts.col.email"), t("contacts.col.name"), t("contacts.col.industry"), t("contacts.col.groups"), t("contacts.col.comment")],
      ...rows,
    ]);
    ws["!cols"] = [{ wch: 18 }, { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 25 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contacts");
    XLSX.writeFile(wb, "sendsafe_contacts_export.xlsx");
  }, [sortedLeads, groups, memberships, t]);

  const parseFile = useCallback(async (file: File) => {
    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      let rows: PendingRow[] = [];

      if (ext === "csv") {
        const text = await file.text();
        const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length < 2) { toast.error("CSV file is empty or has no data rows"); return; }
        const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
        const domainIdx = header.findIndex((h) => h.includes("domain") || h.includes("domene") || h.includes("nettside") || h.includes("website"));
        const companyIdx = header.findIndex((h) => h.includes("company") || h.includes("selskap") || h.includes("bedrift") || h.includes("firma"));
        const emailIdx = header.findIndex((h) => h.includes("email") || h.includes("e-post") || h.includes("epost"));
        const nameIdx = header.findIndex((h) => h.includes("name") || h.includes("navn"));
        const industryIdx = header.findIndex((h) => h.includes("industry") || h.includes("bransje"));
        const groupsIdx = header.findIndex((h) => h.includes("group") || h.includes("gruppe"));
        const commentIdx = header.findIndex((h) => h.includes("comment") || h.includes("kommentar") || h.includes("notat"));
        if (companyIdx === -1 || emailIdx === -1) { toast.error("CSV must have 'company' and 'email' columns"); return; }
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map((c) => c.trim());
          if (cols[emailIdx]) {
            const raw = groupsIdx !== -1 ? cols[groupsIdx] || null : null;
            rows.push({ domain: domainIdx !== -1 ? cols[domainIdx] || null : null, company: cols[companyIdx] || "", contact_email: cols[emailIdx], contact_name: nameIdx !== -1 ? cols[nameIdx] || null : null, industry: industryIdx !== -1 ? cols[industryIdx] || null : null, comment: commentIdx !== -1 ? cols[commentIdx] || null : null, groupNames: parseGroups(raw) });
          }
        }
      } else if (ext === "xlsx" || ext === "xls") {
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
        for (const row of data) {
          const keys = Object.keys(row);
          const domainKey = keys.find((k) => /domain|domene|nettside|website/i.test(k));
          const companyKey = keys.find((k) => /company|selskap|bedrift|firma/i.test(k));
          const emailKey = keys.find((k) => /email|e-post|epost/i.test(k));
          const nameKey = keys.find((k) => /name|navn/i.test(k));
          const industryKey = keys.find((k) => /industry|bransje/i.test(k));
          const groupsKey = keys.find((k) => /group|gruppe/i.test(k));
          const commentKey = keys.find((k) => /comment|kommentar|notat/i.test(k));
          if (companyKey && emailKey && row[emailKey]) {
            const raw = groupsKey ? row[groupsKey] || null : null;
            rows.push({ domain: domainKey ? row[domainKey] || null : null, company: row[companyKey] || "", contact_email: row[emailKey], contact_name: nameKey ? row[nameKey] || null : null, industry: industryKey ? row[industryKey] || null : null, comment: commentKey ? row[commentKey] || null : null, groupNames: parseGroups(raw) });
          }
        }
      } else { toast.error("Unsupported file type. Use .csv, .xlsx, or .xls"); return; }

      if (rows.length === 0) { toast.error("No valid contacts found in file"); return; }
      setPendingRows(rows);
      setImportStats(null);
    } catch (err: unknown) { console.error("File upload error:", err); toast.error("Failed to read file"); }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) parseFile(file); }, [parseFile]);

  const updateManualRow = (i: number, field: keyof ManualRow, value: string) => {
    setManualRows((rows) => rows.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  const previewManual = () => {
    const valid = manualRows.filter((r) => r.company.trim() && r.contact_email.trim());
    if (valid.length === 0) return;
    const rows: PendingRow[] = valid.map((r) => {
      const group = groups.find((g) => g.id === r.groupId);
      return { domain: null, company: r.company.trim(), contact_email: r.contact_email.trim(), contact_name: r.contact_name.trim() || null, industry: r.industry.trim() || null, comment: null, groupNames: group ? [group.name] : [] };
    });
    setPendingRows(rows);
    setImportStats(null);
  };

  // Inline edit helpers
  const startEditRow = (lead: Lead) => {
    setEditingRow(lead.id);
    setEditValues({ domain: lead.domain || "", company: lead.company, contact_email: lead.contact_email, contact_name: lead.contact_name || "", industry: lead.industry || "", comment: lead.comment || "" });
  };

  const commitEditRow = () => {
    if (!editingRow) return;
    updateLead.mutate({
      id: editingRow,
      domain: editValues.domain || null,
      company: editValues.company,
      contact_email: editValues.contact_email,
      contact_name: editValues.contact_name || null,
      industry: editValues.industry || null,
      comment: editValues.comment || null,
    });
    setEditingRow(null);
    setEditValues({});
  };

  const cancelEditRow = () => { setEditingRow(null); setEditValues({}); };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    createGroup.mutate(newGroupName.trim(), { onSuccess: () => { setNewGroupName(""); setShowCreateGroup(false); } });
  };

  const handleAddToGroup = (groupId: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    addToGroup.mutate({ contactIds: ids, groupId }, { onSuccess: () => { setShowAddToGroup(false); setSelectedIds(new Set()); } });
  };

  const isEditing = (id: string) => editingRow === id;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">{t("contacts.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("contacts.desc")}</p>
      </div>

      {/* Import section */}
      <div className="mb-8 rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex gap-2">
          <button onClick={() => setTab("file")} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === "file" ? "bg-primary text-primary-foreground" : "bg-accent text-foreground hover:bg-accent/80"}`}>{t("contacts.tabFile")}</button>
          <button onClick={() => setTab("manual")} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === "manual" ? "bg-primary text-primary-foreground" : "bg-accent text-foreground hover:bg-accent/80"}`}>{t("contacts.tabManual")}</button>
        </div>

        {/* Shared preview for both file and manual tabs */}
        {pendingRows && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{t("contacts.previewTitle")}</p>
                <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{pendingRows.length}</span> {t("contacts.previewDesc")}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setPendingRows(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent">{t("contacts.cancelImport")}</button>
                <button onClick={confirmImport} disabled={importLeads.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40">{importLeads.isPending ? "…" : `${t("contacts.confirmImport")} ${pendingRows.length}`}</button>
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-accent/80">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("contacts.col.company")}</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("contacts.col.email")}</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("contacts.col.name")}</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("contacts.col.industry")}</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("contacts.col.groups")}</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRows.map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2 font-medium text-foreground">{row.company || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.contact_email}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.contact_name || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.industry || "—"}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {row.groupNames.map((g) => (
                            <span key={g} className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{g}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "file" && !pendingRows && (
          <div onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} className="flex flex-col items-center rounded-xl border-2 border-dashed border-border bg-accent/30 px-6 py-12 text-center transition-colors hover:border-primary/30">
            <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">{t("contacts.dragDrop")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("contacts.requiredColumns")}</p>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) parseFile(file); e.target.value = ""; }} />
            <div className="mt-4 flex gap-3">
              <button onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                <Download className="h-4 w-4" />{t("contacts.downloadTemplate")}
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">{t("contacts.browse")}</button>
            </div>
          </div>
        )}

        {tab === "manual" && (
          <div>
            {pendingRows ? null : (
              <>
                <div className="space-y-2">
                  {manualRows.map((row, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <input value={row.company} onChange={(e) => updateManualRow(i, "company", e.target.value)} placeholder={`${t("contacts.col.company")} *`} className="w-40 min-w-0 flex-1 rounded-lg border border-border bg-accent/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                      <input value={row.contact_email} onChange={(e) => updateManualRow(i, "contact_email", e.target.value)} placeholder={`${t("contacts.col.email")} *`} className="w-44 min-w-0 flex-1 rounded-lg border border-border bg-accent/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                      <input value={row.contact_name} onChange={(e) => updateManualRow(i, "contact_name", e.target.value)} placeholder={t("contacts.col.name")} className="w-36 min-w-0 flex-1 rounded-lg border border-border bg-accent/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                      <input value={row.industry} onChange={(e) => updateManualRow(i, "industry", e.target.value)} placeholder={t("contacts.col.industry")} className="w-32 min-w-0 flex-1 rounded-lg border border-border bg-accent/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                      <select value={row.groupId} onChange={(e) => updateManualRow(i, "groupId", e.target.value)} className="w-36 rounded-lg border border-border bg-accent/30 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
                        <option value="">{t("contacts.col.groups")}</option>
                        {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                      {manualRows.length > 1 && (
                        <button onClick={() => setManualRows((rows) => rows.filter((_, idx) => idx !== i))} className="rounded p-1 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <button onClick={() => setManualRows((rows) => [...rows, emptyManualRow()])} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                    <Plus className="h-3.5 w-3.5" /> {t("contacts.addRow")}
                  </button>
                  <button onClick={previewManual} disabled={!manualRows.some((r) => r.company.trim() && r.contact_email.trim())} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40">{t("contacts.previewTitle")}</button>
                </div>
              </>
            )}
          </div>
        )}

        {importStats && (
          <div className="mt-4 flex gap-4 text-sm">
            <span className="text-success">{importStats.imported} {t("contacts.imported")}</span>
            {importStats.skipped > 0 && <span className="text-muted-foreground">{importStats.skipped} {t("contacts.skipped")}</span>}
          </div>
        )}
      </div>

      {/* Toolbar: filters, groups, export */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Group checkbox filter */}
        {groups.length > 0 && (
          <div ref={groupFilterRef} className="relative">
            <button onClick={() => { setShowGroupFilter((v) => !v); setShowIndustryFilter(false); }} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${filterGroupIds.size > 0 ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:bg-accent"}`}>
              {t("contacts.col.groups")}
              {filterGroupIds.size > 0 && <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-foreground">{filterGroupIds.size}</span>}
              <ChevronDown className="ml-1 h-3 w-3" />
            </button>
            {showGroupFilter && (
              <div className="absolute left-0 top-full z-20 mt-1 min-w-[220px] rounded-lg border border-border bg-card p-2 shadow-lg">
                {groups.map((g) => (
                  <div key={g.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-foreground hover:bg-accent">
                    <label className="flex flex-1 cursor-pointer items-center gap-2">
                      <input type="checkbox" checked={filterGroupIds.has(g.id)} onChange={() => toggleFilterGroup(g.id)} className="h-4 w-4 rounded border-border accent-primary" />
                      {g.name}
                    </label>
                    <button onClick={() => { deleteGroup.mutate(g.id); setFilterGroupIds((prev) => { const next = new Set(prev); next.delete(g.id); return next; }); }} className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 [div:hover>&]:opacity-100" title={t("contacts.deleteGroup")}>
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {filterGroupIds.size > 0 && (
                  <button onClick={() => setFilterGroupIds(new Set())} className="mt-1 w-full rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground">{t("contacts.filterAll")}</button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Industry checkbox filter */}
        {industries.length > 0 && (
          <div ref={industryFilterRef} className="relative">
            <button onClick={() => { setShowIndustryFilter((v) => !v); setShowGroupFilter(false); }} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${filterIndustries.size > 0 ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:bg-accent"}`}>
              {t("contacts.col.industry")}
              {filterIndustries.size > 0 && <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-foreground">{filterIndustries.size}</span>}
              <ChevronDown className="ml-1 h-3 w-3" />
            </button>
            {showIndustryFilter && (
              <div className="absolute left-0 top-full z-20 mt-1 min-w-[200px] rounded-lg border border-border bg-card p-2 shadow-lg">
                {industries.map((ind) => (
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

        <button onClick={() => setShowCreateGroup(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
          <Plus className="h-3.5 w-3.5" /> {t("contacts.createGroup")}
        </button>

        {selectedIds.size > 0 && (
          <>
            <span className="text-sm text-muted-foreground">{selectedIds.size} {t("contacts.selected")}</span>
            <button onClick={() => setShowAddToGroup(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              <Users className="h-3.5 w-3.5" /> {t("contacts.addToGroup")}
            </button>
            <button
              onClick={() => {
                const ids = Array.from(selectedIds);
                enrichContacts.mutate(ids, {
                  onSuccess: (data) => {
                    const ok = data.results.filter((r) => r.success).length;
                    toast.success(`${ok} ${t("contacts.enrichDone")}`);
                    setSelectedIds(new Set());
                  },
                  onError: (err) => toast.error(err.message),
                });
              }}
              disabled={enrichContacts.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-40"
              title={t("contacts.enrichDesc")}
            >
              <Sparkles className="h-3.5 w-3.5" /> {enrichContacts.isPending ? t("contacts.enriching") : t("contacts.enrich")}
            </button>
          </>
        )}

        {leads.length > 0 && (
          <button onClick={exportContacts} className="ml-auto inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
            <Download className="h-3.5 w-3.5" /> {t("contacts.export")}
          </button>
        )}
      </div>

      {/* Create group dialog */}
      {showCreateGroup && (
        <div className="mb-4 flex items-center gap-2">
          <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder={t("contacts.groupName")} className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()} autoFocus />
          <button onClick={handleCreateGroup} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">{t("contacts.create")}</button>
          <button onClick={() => { setShowCreateGroup(false); setNewGroupName(""); }} className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">{t("contacts.cancel")}</button>
        </div>
      )}

      {/* Add to group dialog */}
      {showAddToGroup && (
        <div className="mb-4 flex items-center gap-2">
          <select className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground" defaultValue="" onChange={(e) => { if (e.target.value) handleAddToGroup(e.target.value); }}>
            <option value="" disabled>{t("contacts.selectGroup")}</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <button onClick={() => setShowAddToGroup(false)} className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Contact table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : sortedLeads.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">{t("contacts.noContacts")}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-accent/50">
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" checked={selectedIds.size === sortedLeads.length && sortedLeads.length > 0} onChange={toggleSelectAll} className="h-4 w-4 rounded border-border accent-primary" />
                </th>
                <th className="cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground" onClick={() => toggleSort("domain")}>
                  {t("contacts.col.domain")}<SortIcon field="domain" />
                </th>
                <th className="cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground" onClick={() => toggleSort("company")}>
                  {t("contacts.col.company")}<SortIcon field="company" />
                </th>
                <th className="cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground" onClick={() => toggleSort("contact_email")}>
                  {t("contacts.col.email")}<SortIcon field="contact_email" />
                </th>
                <th className="cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground" onClick={() => toggleSort("contact_name")}>
                  {t("contacts.col.name")}<SortIcon field="contact_name" />
                </th>
                <th className="cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground" onClick={() => toggleSort("industry")}>
                  {t("contacts.col.industry")}<SortIcon field="industry" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("contacts.col.groups")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("contacts.col.comment")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("contacts.col.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedLeads.map((lead) => (
                <tr key={lead.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedIds.has(lead.id)} onChange={() => toggleSelect(lead.id)} className="h-4 w-4 rounded border-border accent-primary" />
                  </td>
                  {isEditing(lead.id) ? (
                    <>
                      <td className="px-4 py-2"><input value={editValues.domain} onChange={(e) => setEditValues((v) => ({ ...v, domain: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && commitEditRow()} className="w-full rounded border border-primary bg-card px-2 py-1 text-sm focus:outline-none" autoFocus /></td>
                      <td className="px-4 py-2"><input value={editValues.company} onChange={(e) => setEditValues((v) => ({ ...v, company: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && commitEditRow()} className="w-full rounded border border-primary bg-card px-2 py-1 text-sm focus:outline-none" /></td>
                      <td className="px-4 py-2"><input value={editValues.contact_email} onChange={(e) => setEditValues((v) => ({ ...v, contact_email: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && commitEditRow()} className="w-full rounded border border-primary bg-card px-2 py-1 text-sm focus:outline-none" /></td>
                      <td className="px-4 py-2"><input value={editValues.contact_name} onChange={(e) => setEditValues((v) => ({ ...v, contact_name: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && commitEditRow()} className="w-full rounded border border-primary bg-card px-2 py-1 text-sm focus:outline-none" /></td>
                      <td className="px-4 py-2"><input value={editValues.industry} onChange={(e) => setEditValues((v) => ({ ...v, industry: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && commitEditRow()} className="w-full rounded border border-primary bg-card px-2 py-1 text-sm focus:outline-none" /></td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{lead.domain || "—"}</td>
                      <td className="px-4 py-3 text-sm"><span className="font-medium text-foreground">{lead.company}</span></td>
                      <td className="px-4 py-3 text-sm text-foreground">{lead.contact_email}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{lead.contact_name || "—"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{lead.industry || "—"}</td>
                    </>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {getGroupsForContact(lead.id).map((g) => (
                        <span key={g.id} className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{g.name}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {isEditing(lead.id) ? (
                      <input value={editValues.comment} onChange={(e) => setEditValues((v) => ({ ...v, comment: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && commitEditRow()} className="w-full rounded border border-primary bg-card px-2 py-1 text-sm focus:outline-none" />
                    ) : (
                      lead.comment || "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {isEditing(lead.id) ? (
                        <>
                          <button onClick={commitEditRow} className="rounded p-1 text-success transition-colors hover:bg-success/10" title={t("contacts.save")}><Check className="h-4 w-4" /></button>
                          <button onClick={cancelEditRow} className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground" title={t("contacts.cancel")}><X className="h-4 w-4" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEditRow(lead)} className="rounded p-1 text-muted-foreground transition-colors hover:text-primary" title={t("contacts.edit")}><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => deleteLead.mutate(lead.id)} className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive" title={t("contacts.delete")}><Trash2 className="h-4 w-4" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ContactsPage;
