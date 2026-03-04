import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Download, Trash2, Plus, X, Users, Pencil, Check, ChevronUp, ChevronDown, ChevronsUpDown, Wand2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/i18n/LanguageContext";
import { useLeads, useImportLeads, useUpdateLead, useDeleteLead } from "@/hooks/use-leads";
import { useSentEmailCounts } from "@/hooks/use-emails";
import {
  useContactGroups,
  useCreateContactGroup,
  useDeleteContactGroup,
  useGroupMemberships,
  useAddToGroup,
} from "@/hooks/use-contact-groups";
import { toast } from "sonner";
import type { Lead } from "@/types/database";

type SortField = "domain" | "company" | "contact_email" | "contact_name" | "industry" | "employee_count";
type SortDir = "asc" | "desc";
type PendingRow = { domain: string | null; company: string; contact_email: string; contact_name: string | null; industry: string | null; comment: string | null; employee_count: number | null; groupNames: string[] };
type ManualRow = { company: string; contact_email: string; contact_name: string; domain: string; industry: string; employee_count: string; groupId: string };
type ConflictItem = { incoming: PendingRow; existing: Lead };
const emptyManualRow = (): ManualRow => ({ company: "", contact_email: "", contact_name: "", domain: "", industry: "", employee_count: "", groupId: "" });

const SENT_GROUP_ID = "__sent__";
const NOT_SENT_GROUP_ID = "__not_sent__";

const ContactsPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: leads = [], isLoading } = useLeads();
  const importLeads = useImportLeads();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const { data: groups = [] } = useContactGroups();
  const createGroup = useCreateContactGroup();
  const deleteGroup = useDeleteContactGroup();
  const { data: memberships = [] } = useGroupMemberships();
  const addToGroup = useAddToGroup();
  const { data: sentCounts = new Map() } = useSentEmailCounts();

  const [tab, setTab] = useState<"file" | "manual">("file");
  const [manualRows, setManualRows] = useState<ManualRow[]>([emptyManualRow()]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterGroupIds, setFilterGroupIds] = useState<Set<string>>(new Set());
  const [filterIndustries, setFilterIndustries] = useState<Set<string>>(new Set());
  const [empMin, setEmpMin] = useState<string>("");
  const [empMax, setEmpMax] = useState<string>("");
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
  const [conflictData, setConflictData] = useState<{ newRows: PendingRow[]; conflicts: ConflictItem[]; duplicateCount: number } | null>(null);
  const [conflictResolutions, setConflictResolutions] = useState<Record<number, "overwrite" | "skip">>({});
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
    const realGroupIds = new Set([...filterGroupIds].filter((id) => id !== SENT_GROUP_ID && id !== NOT_SENT_GROUP_ID));
    if (realGroupIds.size > 0) {
      result = result.filter((lead) => memberships.some((m) => m.contact_id === lead.id && realGroupIds.has(m.group_id)));
    }
    if (filterGroupIds.has(SENT_GROUP_ID)) {
      result = result.filter((lead) => (sentCounts.get(lead.contact_email.toLowerCase()) ?? 0) > 0);
    }
    if (filterGroupIds.has(NOT_SENT_GROUP_ID)) {
      result = result.filter((lead) => (sentCounts.get(lead.contact_email.toLowerCase()) ?? 0) === 0);
    }
    if (filterIndustries.size > 0) {
      result = result.filter((lead) => lead.industry != null && filterIndustries.has(lead.industry));
    }
    const min = empMin !== "" ? parseInt(empMin) : null;
    const max = empMax !== "" ? parseInt(empMax) : null;
    if (min !== null || max !== null) {
      result = result.filter((lead) => {
        const ec = lead.employee_count;
        if (ec == null) return false;
        if (min !== null && ec < min) return false;
        if (max !== null && ec > max) return false;
        return true;
      });
    }
    return result;
  }, [leads, filterGroupIds, filterIndustries, memberships, empMin, empMax, sentCounts]);

  // Sort
  const sortedLeads = useMemo(() => {
    if (!sortField) return filtered;
    return [...filtered].sort((a, b) => {
      if (sortField === "employee_count") {
        const aVal = a.employee_count ?? -1;
        const bVal = b.employee_count ?? -1;
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const sf = sortField as Exclude<SortField, "employee_count">;
      const aVal = (a[sf] || "").toLowerCase();
      const bVal = (b[sf] || "").toLowerCase();
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

  const isEmail = (v: string | null | undefined) => !!v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const isDomain = (v: string | null | undefined) => !!v && /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(v.trim()) && !v!.includes("@") && !v!.includes(" ");
  const domainFromEmail = (email: string): string | null => email.includes("@") ? (email.split("@")[1] || null) : null;

  const fixColumns = async () => {
    const ids = Array.from(selectedIds);
    const toFix = leads.filter((l) => ids.includes(l.id));
    let fixedCount = 0;

    for (const lead of toFix) {
      const updates: Record<string, string | null> = {};
      let { domain, company, contact_email, contact_name, industry } = lead;

      // Move email values found in non-email fields into contact_email
      for (const [key, val] of [["domain", domain], ["company", company], ["contact_name", contact_name], ["industry", industry]] as [string, string | null][]) {
        if (isEmail(val) && !isEmail(contact_email)) {
          updates.contact_email = val!.trim();
          updates[key] = null;
          contact_email = val;
          if (key === "domain") domain = null;
          if (key === "company") company = null;
          if (key === "contact_name") contact_name = null;
          if (key === "industry") industry = null;
        }
      }

      // Move domain values found in non-domain fields into domain
      for (const [key, val] of [["company", company], ["contact_email", contact_email], ["contact_name", contact_name]] as [string, string | null][]) {
        if (isDomain(val) && !domain) {
          updates.domain = val!.trim();
          updates[key] = null;
          domain = val;
          if (key === "company") company = null;
          if (key === "contact_email") contact_email = null;
          if (key === "contact_name") contact_name = null;
        }
      }

      // Auto-fill domain from email if still missing
      if (!domain && contact_email && isEmail(contact_email)) {
        const derived = domainFromEmail(contact_email);
        if (derived) { updates.domain = derived; domain = derived; }
      }

      if (Object.keys(updates).length > 0) {
        await updateLead.mutateAsync({ id: lead.id, ...updates });
        fixedCount++;
      }
    }

    if (fixedCount > 0) {
      toast.success(`${fixedCount} ${t("contacts.fixDone")}`);
    } else {
      toast.info(t("contacts.fixNone"));
    }
    setSelectedIds(new Set());
  };

  // Parse groups: plain "Kunde", comma/semicolon separated "Kunde, Lead", or legacy "(Kunde;Lead)"
  const parseGroups = (raw: string | undefined | null): string[] => {
    if (!raw) return [];
    const inner = raw.replace(/^\(|\)$/g, "").replace(/^\{.*\(([^)]+)\).*\}$/, "$1");
    return inner.split(/[,;]/).map((g) => g.trim()).filter(Boolean);
  };

  // Execute import: insert new rows + update overwritten conflicts
  const executeImport = async (newRows: PendingRow[], overwrite: ConflictItem[], duplicateCount: number) => {
    try {
      const groupCache = new Map(groups.map((g) => [g.name.toLowerCase(), g]));
      let importedCount = 0;

      if (newRows.length > 0) {
        const toInsert = newRows.map((r) => ({ domain: r.domain, company: r.company, contact_email: r.contact_email, contact_name: r.contact_name, industry: r.industry, comment: r.comment, employee_count: r.employee_count, status: "imported" as const }));
        const result = await importLeads.mutateAsync(toInsert);
        importedCount += result.length;
        for (let i = 0; i < result.length; i++) {
          for (const name of newRows[i].groupNames) {
            const key = name.toLowerCase();
            let group = groupCache.get(key);
            if (!group) { const created = await createGroup.mutateAsync(name); groupCache.set(key, created); group = created; }
            if (group) await addToGroup.mutateAsync({ contactIds: [result[i].id], groupId: group.id });
          }
        }
      }

      for (const { incoming, existing } of overwrite) {
        await updateLead.mutateAsync({ id: existing.id, company: incoming.company, contact_name: incoming.contact_name, domain: incoming.domain, industry: incoming.industry, employee_count: incoming.employee_count, comment: incoming.comment });
        importedCount++;
      }

      setImportStats({ imported: importedCount, skipped: duplicateCount });
      setPendingRows(null);
      setConflictData(null);
      setConflictResolutions({});
      if (tab === "manual") setManualRows([emptyManualRow()]);
      if (duplicateCount > 0) toast.info(`${duplicateCount} duplikat${duplicateCount > 1 ? "er" : ""} hoppet over`);
    } catch {
      toast.error("Kunne ikke importere kontakter");
    }
  };

  // Analyse pending rows against existing contacts, then import or show conflict modal
  const analyseImport = async () => {
    if (!pendingRows) return;
    const byEmail = new Map(leads.map((l) => [l.contact_email.toLowerCase(), l]));
    const newRows: PendingRow[] = [];
    const conflicts: ConflictItem[] = [];
    let duplicateCount = 0;

    for (const row of pendingRows) {
      const existing = byEmail.get(row.contact_email.toLowerCase());
      if (!existing) { newRows.push(row); continue; }
      const differs =
        (row.contact_name ?? null) !== (existing.contact_name ?? null) ||
        (row.company ?? "") !== (existing.company ?? "") ||
        (row.domain ?? null) !== (existing.domain ?? null) ||
        (row.industry ?? null) !== (existing.industry ?? null) ||
        (row.employee_count ?? null) !== (existing.employee_count ?? null) ||
        (row.comment ?? null) !== (existing.comment ?? null);
      if (differs) conflicts.push({ incoming: row, existing });
      else duplicateCount++;
    }

    if (conflicts.length === 0) {
      await executeImport(newRows, [], duplicateCount);
    } else {
      setConflictResolutions(Object.fromEntries(conflicts.map((_, i) => [i, "overwrite" as const])));
      setConflictData({ newRows, conflicts, duplicateCount });
    }
  };

  const downloadTemplate = useCallback(async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([
      ["Selskap", "E-post", "Navn", "Domene", "Gruppe", "Bransje", "Kommentar", "Ansatte"],
      ["Acme AS", "ola@acme.no", "Ola Nordmann", "acme.no", "Kunde", "Teknologi", "Møtt på konferanse", 50],
      ["Globex AS", "kari@globex.no", "Kari Hansen", "globex.no", "Lead", "Finans", "Følg opp Q2", 120],
    ]);
    ws["!cols"] = [{ wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 25 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contacts");
    XLSX.writeFile(wb, "sendsafe_contacts_template.xlsx");
  }, []);

  const exportContacts = useCallback(async () => {
    const XLSX = await import("xlsx");
    const rows = sortedLeads.map((lead) => {
      const contactGroups = getGroupsForContact(lead.id);
      const groupStr = contactGroups.map((g) => g.name).join(", ");
      return [lead.company, lead.contact_email, lead.contact_name || "", lead.domain || "", groupStr, lead.industry || "", lead.comment || "", lead.employee_count ?? ""];
    });
    const ws = XLSX.utils.aoa_to_sheet([
      ["Selskap", "E-post", "Navn", "Domene", "Gruppe", "Bransje", "Kommentar", "Ansatte"],
      ...rows,
    ]);
    ws["!cols"] = [{ wch: 18 }, { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 10 }];
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
        const employeeIdx = header.findIndex((h) => h.includes("ansatte") || h.includes("employees") || h.includes("employee_count"));
        if (companyIdx === -1 || emailIdx === -1) { toast.error("CSV must have 'company' and 'email' columns"); return; }
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map((c) => c.trim());
          if (cols[emailIdx]) {
            const raw = groupsIdx !== -1 ? cols[groupsIdx] || null : null;
            const empRaw = employeeIdx !== -1 ? parseInt(cols[employeeIdx]) : NaN;
            const parsedEmail = cols[emailIdx];
            const parsedDomain = (domainIdx !== -1 ? cols[domainIdx] || null : null) || domainFromEmail(parsedEmail);
            rows.push({ domain: parsedDomain, company: cols[companyIdx] || "", contact_email: parsedEmail, contact_name: nameIdx !== -1 ? cols[nameIdx] || null : null, industry: industryIdx !== -1 ? cols[industryIdx] || null : null, comment: commentIdx !== -1 ? cols[commentIdx] || null : null, employee_count: isNaN(empRaw) ? null : empRaw, groupNames: parseGroups(raw) });
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
          const employeeKey = keys.find((k) => /ansatte|employees|employee_count/i.test(k));
          if (companyKey && emailKey && row[emailKey]) {
            const raw = groupsKey ? row[groupsKey] || null : null;
            const empRaw = employeeKey ? parseInt(String(row[employeeKey])) : NaN;
            const parsedEmail = String(row[emailKey]);
            const parsedDomain = (domainKey ? row[domainKey] || null : null) || domainFromEmail(parsedEmail);
            rows.push({ domain: parsedDomain, company: row[companyKey] || "", contact_email: parsedEmail, contact_name: nameKey ? row[nameKey] || null : null, industry: industryKey ? row[industryKey] || null : null, comment: commentKey ? row[commentKey] || null : null, employee_count: isNaN(empRaw) ? null : empRaw, groupNames: parseGroups(raw) });
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
      const empParsed = r.employee_count.trim() ? parseInt(r.employee_count.trim()) : null;
      const trimmedEmail = r.contact_email.trim();
      return { domain: r.domain.trim() || domainFromEmail(trimmedEmail) || null, company: r.company.trim(), contact_email: trimmedEmail, contact_name: r.contact_name.trim() || null, industry: r.industry.trim() || null, comment: null, employee_count: isNaN(empParsed!) ? null : empParsed, groupNames: group ? [group.name] : [] };
    });
    setPendingRows(rows);
    setImportStats(null);
  };

  // Inline edit helpers
  const startEditRow = (lead: Lead) => {
    setEditingRow(lead.id);
    setEditValues({ domain: lead.domain || "", company: lead.company, contact_email: lead.contact_email, contact_name: lead.contact_name || "", industry: lead.industry || "", comment: lead.comment || "", employee_count: lead.employee_count?.toString() || "" });
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
      employee_count: editValues.employee_count ? parseInt(editValues.employee_count) : null,
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

        {/* Conflict resolution panel */}
        {conflictData && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Konflikter funnet</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{conflictData.newRows.length}</span> nye ·{" "}
                  <span className="font-medium text-foreground">{conflictData.conflicts.length}</span> konflikter ·{" "}
                  <span className="font-medium text-foreground">{conflictData.duplicateCount}</span> duplikater hoppet over
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConflictResolutions(Object.fromEntries(conflictData.conflicts.map((_, i) => [i, "overwrite" as const])))}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                >
                  Overskriv alle
                </button>
                <button
                  onClick={() => setConflictResolutions(Object.fromEntries(conflictData.conflicts.map((_, i) => [i, "skip" as const])))}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                >
                  Hopp over alle
                </button>
              </div>
            </div>

            <div className="mb-3 max-h-80 overflow-y-auto rounded-xl border border-border">
              {conflictData.conflicts.map((conflict, i) => {
                const { incoming, existing } = conflict;
                const fieldLabels: { key: keyof typeof incoming; label: string }[] = [
                  { key: "contact_name", label: "Navn" },
                  { key: "company", label: "Selskap" },
                  { key: "domain", label: "Domene" },
                  { key: "industry", label: "Bransje" },
                  { key: "employee_count", label: "Ansatte" },
                  { key: "comment", label: "Kommentar" },
                ];
                const diffFields = fieldLabels.filter(({ key }) => {
                  const a = (incoming[key] ?? null) as string | number | null;
                  const b = (existing[key as keyof typeof existing] ?? null) as string | number | null;
                  return String(a ?? "") !== String(b ?? "");
                });
                return (
                  <div key={i} className="border-b border-border px-4 py-3 last:border-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{incoming.contact_email}</p>
                        <div className="mt-1 space-y-0.5">
                          {diffFields.map(({ key, label }) => (
                            <p key={key} className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">{label}:</span>{" "}
                              <span className="line-through opacity-60">{String(existing[key as keyof typeof existing] ?? "—")}</span>
                              {" → "}
                              <span>{String(incoming[key] ?? "—")}</span>
                            </p>
                          ))}
                        </div>
                      </div>
                      <select
                        value={conflictResolutions[i] ?? "overwrite"}
                        onChange={(e) => setConflictResolutions((r) => ({ ...r, [i]: e.target.value as "overwrite" | "skip" }))}
                        className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
                      >
                        <option value="overwrite">Overskriv</option>
                        <option value="skip">Hopp over</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => { setConflictData(null); setConflictResolutions({}); setPendingRows(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
              >
                {t("contacts.cancelImport")}
              </button>
              <button
                onClick={() => {
                  const overwrite = conflictData.conflicts.filter((_, i) => (conflictResolutions[i] ?? "overwrite") === "overwrite");
                  executeImport(conflictData.newRows, overwrite, conflictData.duplicateCount);
                }}
                disabled={importLeads.isPending || updateLead.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
              >
                {importLeads.isPending || updateLead.isPending ? "…" : "Bekreft"}
              </button>
            </div>
          </div>
        )}

        {/* Shared preview for both file and manual tabs */}
        {pendingRows && !conflictData && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{t("contacts.previewTitle")}</p>
                <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{pendingRows.length}</span> {t("contacts.previewDesc")}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setPendingRows(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent">{t("contacts.cancelImport")}</button>
                <button onClick={analyseImport} disabled={importLeads.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40">{importLeads.isPending ? "…" : `${t("contacts.confirmImport")} ${pendingRows.length}`}</button>
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-accent/80">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("contacts.col.company")}</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("contacts.col.email")}</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("contacts.col.name")}</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("contacts.col.domain")}</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("contacts.col.groups")}</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("contacts.col.industry")}</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("contacts.col.comment")}</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ansatte</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRows.map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2 font-medium text-foreground">{row.company || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.contact_email}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.contact_name || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.domain || "—"}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {row.groupNames.map((g) => (
                            <span key={g} className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{g}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{row.industry || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.comment || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.employee_count ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "file" && !pendingRows && !conflictData && (
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
                      <input value={row.domain} onChange={(e) => updateManualRow(i, "domain", e.target.value)} placeholder={t("contacts.col.domain")} className="w-36 min-w-0 flex-1 rounded-lg border border-border bg-accent/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                      <input value={row.industry} onChange={(e) => updateManualRow(i, "industry", e.target.value)} placeholder={t("contacts.col.industry")} className="w-32 min-w-0 flex-1 rounded-lg border border-border bg-accent/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                      <input type="number" min="0" value={row.employee_count} onChange={(e) => updateManualRow(i, "employee_count", e.target.value)} placeholder="Ansatte" className="w-24 min-w-0 rounded-lg border border-border bg-accent/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
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
        {(groups.length > 0 || true) && (
          <div ref={groupFilterRef} className="relative">
            <button onClick={() => { setShowGroupFilter((v) => !v); setShowIndustryFilter(false); }} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${filterGroupIds.size > 0 ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:bg-accent"}`}>
              {t("contacts.col.groups")}
              {filterGroupIds.size > 0 && <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-foreground">{filterGroupIds.size}</span>}
              <ChevronDown className="ml-1 h-3 w-3" />
            </button>
            {showGroupFilter && (
              <div className="absolute left-0 top-full z-20 mt-1 min-w-[220px] rounded-lg border border-border bg-card p-2 shadow-lg">
                <div className="mb-1 border-b border-border pb-1">
                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
                    <input type="checkbox" checked={filterGroupIds.has(SENT_GROUP_ID)} onChange={() => toggleFilterGroup(SENT_GROUP_ID)} className="h-4 w-4 rounded border-border accent-primary" />
                    <span className="font-medium text-green-700 dark:text-green-400">Sent</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
                    <input type="checkbox" checked={filterGroupIds.has(NOT_SENT_GROUP_ID)} onChange={() => toggleFilterGroup(NOT_SENT_GROUP_ID)} className="h-4 w-4 rounded border-border accent-primary" />
                    <span className="font-medium text-muted-foreground">Ikke sent</span>
                  </label>
                </div>
                {groups.map((g) => (
                  <div key={g.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-foreground hover:bg-accent">
                    <label className="flex flex-1 cursor-pointer items-center gap-2">
                      <input type="checkbox" checked={filterGroupIds.has(g.id)} onChange={() => toggleFilterGroup(g.id)} className="h-4 w-4 rounded border-border accent-primary" />
                      {g.name}
                    </label>
                    <button onClick={() => { deleteGroup.mutate(g.id); setFilterGroupIds((prev) => { const next = new Set(prev); next.delete(g.id); return next; }); }} className="rounded p-0.5 text-muted-foreground hover:text-destructive transition-colors" title={t("contacts.deleteGroup")}>
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

        {/* Employee count range filter */}
        <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <span className="text-xs font-medium text-muted-foreground">Ansatte</span>
          <input
            type="number"
            min="0"
            value={empMin}
            onChange={(e) => setEmpMin(e.target.value)}
            placeholder="Fra"
            className="w-16 rounded border border-border bg-accent/30 px-1.5 py-0.5 text-xs text-foreground focus:border-primary focus:outline-none"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <input
            type="number"
            min="0"
            value={empMax}
            onChange={(e) => setEmpMax(e.target.value)}
            placeholder="Til"
            className="w-16 rounded border border-border bg-accent/30 px-1.5 py-0.5 text-xs text-foreground focus:border-primary focus:outline-none"
          />
          {(empMin !== "" || empMax !== "") && (
            <button onClick={() => { setEmpMin(""); setEmpMax(""); }} className="ml-0.5 text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
          )}
        </div>

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
              onClick={fixColumns}
              disabled={updateLead.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-40"
              title={t("contacts.fixDesc")}
            >
              <Wand2 className="h-3.5 w-3.5" /> {updateLead.isPending ? t("contacts.fixing") : t("contacts.fix")}
            </button>
            <button
              onClick={() => {
                const ids = Array.from(selectedIds).join(",");
                navigate(`/dashboard/create?contacts=${ids}`);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" /> Ny kampanje
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

      {/* Result count */}
      {!isLoading && leads.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {sortedLeads.length < leads.length
            ? <><span className="font-medium text-foreground">{sortedLeads.length}</span> av {leads.length} kontakter</>
            : <><span className="font-medium text-foreground">{leads.length}</span> kontakter</>
          }
        </p>
      )}

      {/* Contact table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : sortedLeads.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">{t("contacts.noContacts")}</div>
      ) : (
        <div className="rounded-xl border border-border">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-border bg-accent/50">
                <th className="w-9 px-2 py-2">
                  <input type="checkbox" checked={selectedIds.size === sortedLeads.length && sortedLeads.length > 0} onChange={toggleSelectAll} className="h-4 w-4 rounded border-border accent-primary" />
                </th>
                <th className="w-[17%] cursor-pointer select-none px-2 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground" onClick={() => toggleSort("company")}>
                  {t("contacts.col.company")}<SortIcon field="company" />
                </th>
                <th className="w-[19%] cursor-pointer select-none px-2 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground" onClick={() => toggleSort("contact_email")}>
                  {t("contacts.col.email")}<SortIcon field="contact_email" />
                </th>
                <th className="w-[13%] cursor-pointer select-none px-2 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground" onClick={() => toggleSort("contact_name")}>
                  {t("contacts.col.name")}<SortIcon field="contact_name" />
                </th>
                <th className="w-[12%] cursor-pointer select-none px-2 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground" onClick={() => toggleSort("domain")}>
                  {t("contacts.col.domain")}<SortIcon field="domain" />
                </th>
                <th className="w-[15%] px-2 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("contacts.col.groups")}</th>
                <th className="w-[9%] cursor-pointer select-none px-2 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground" onClick={() => toggleSort("industry")}>
                  {t("contacts.col.industry")}<SortIcon field="industry" />
                </th>
                <th className="w-16 cursor-pointer select-none px-2 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground" onClick={() => toggleSort("employee_count")}>
                  Ansatte<SortIcon field="employee_count" />
                </th>
                <th className="w-12 px-2 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("contacts.col.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedLeads.map((lead) => (
                <tr key={lead.id} className="border-b border-border last:border-0">
                  <td className="px-2 py-2">
                    <input type="checkbox" checked={selectedIds.has(lead.id)} onChange={() => toggleSelect(lead.id)} className="h-4 w-4 rounded border-border accent-primary" />
                  </td>
                  {isEditing(lead.id) ? (
                    <>
                      <td className="px-2 py-1.5"><input value={editValues.company} onChange={(e) => setEditValues((v) => ({ ...v, company: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && commitEditRow()} className="w-full rounded border border-primary bg-card px-2 py-1 text-sm focus:outline-none" autoFocus /></td>
                      <td className="px-2 py-1.5"><input value={editValues.contact_email} onChange={(e) => setEditValues((v) => ({ ...v, contact_email: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && commitEditRow()} className="w-full rounded border border-primary bg-card px-2 py-1 text-sm focus:outline-none" /></td>
                      <td className="px-2 py-1.5"><input value={editValues.contact_name} onChange={(e) => setEditValues((v) => ({ ...v, contact_name: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && commitEditRow()} className="w-full rounded border border-primary bg-card px-2 py-1 text-sm focus:outline-none" /></td>
                      <td className="px-2 py-1.5"><input value={editValues.domain} onChange={(e) => setEditValues((v) => ({ ...v, domain: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && commitEditRow()} className="w-full rounded border border-primary bg-card px-2 py-1 text-sm focus:outline-none" /></td>
                      <td className="px-2 py-1.5">{/* groups not editable inline */}</td>
                      <td className="px-2 py-1.5"><input value={editValues.industry} onChange={(e) => setEditValues((v) => ({ ...v, industry: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && commitEditRow()} className="w-full rounded border border-primary bg-card px-2 py-1 text-sm focus:outline-none" /></td>
                      <td className="px-2 py-1.5"><input type="number" min="0" value={editValues.employee_count} onChange={(e) => setEditValues((v) => ({ ...v, employee_count: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && commitEditRow()} className="w-full rounded border border-primary bg-card px-2 py-1 text-sm focus:outline-none" /></td>
                    </>
                  ) : (
                    <>
                      <td className="px-2 py-2 text-sm"><span className="block truncate font-medium text-foreground" title={lead.company}>{lead.company}</span></td>
                      <td className="px-2 py-2 text-sm"><span className="block truncate text-foreground" title={lead.contact_email}>{lead.contact_email}</span></td>
                      <td className="px-2 py-2 text-sm"><span className="block truncate text-muted-foreground" title={lead.contact_name || ""}>{lead.contact_name || "—"}</span></td>
                      <td className="px-2 py-2 text-sm"><span className="block truncate text-muted-foreground" title={lead.domain || ""}>{lead.domain || "—"}</span></td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-1">
                          {getGroupsForContact(lead.id).map((g) => (
                            <span key={g.id} className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{g.name}</span>
                          ))}
                          {(sentCounts.get(lead.contact_email.toLowerCase()) ?? 0) > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                              Sent <span className="rounded-full bg-green-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{sentCounts.get(lead.contact_email.toLowerCase())}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-sm"><span className="block truncate text-muted-foreground" title={lead.industry || ""}>{lead.industry || "—"}</span></td>
                      <td className="px-2 py-2 text-sm text-muted-foreground">{lead.employee_count ?? "—"}</td>
                    </>
                  )}
                  <td className="px-1 py-2">
                    <div className="flex items-center gap-1">
                      {isEditing(lead.id) ? (
                        <>
                          <button onClick={commitEditRow} className="rounded p-0.5 text-success transition-colors hover:bg-success/10" title={t("contacts.save")}><Check className="h-4 w-4" /></button>
                          <button onClick={cancelEditRow} className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground" title={t("contacts.cancel")}><X className="h-4 w-4" /></button>
                        </>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => startEditRow(lead)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              {t("contacts.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteLead.mutate(lead.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t("contacts.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
