import { useState, useRef, useCallback } from "react";
import { Upload, Download, Trash2, Plus, X, Users } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useLeads, useImportLeads, useUpdateLead, useDeleteLead } from "@/hooks/use-leads";
import {
  useContactGroups,
  useCreateContactGroup,
  useDeleteContactGroup,
  useGroupMemberships,
  useAddToGroup,
} from "@/hooks/use-contact-groups";
import { toast } from "sonner";
import type { Lead } from "@/types/database";

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

  const [tab, setTab] = useState<"file" | "manual">("file");
  const [manualInput, setManualInput] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterGroupId, setFilterGroupId] = useState<string>("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [showAddToGroup, setShowAddToGroup] = useState(false);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [importStats, setImportStats] = useState<{ imported: number; skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredLeads = filterGroupId
    ? leads.filter((lead) => memberships.some((m) => m.contact_id === lead.id && m.group_id === filterGroupId))
    : leads;

  const getGroupsForContact = (contactId: string) => {
    const groupIds = memberships.filter((m) => m.contact_id === contactId).map((m) => m.group_id);
    return groups.filter((g) => groupIds.includes(g.id));
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
    if (selectedIds.size === filteredLeads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLeads.map((l) => l.id)));
    }
  };

  // Parse groups string like "(Kunde;Lead)" → ["Kunde", "Lead"]
  const parseGroups = (raw: string | undefined | null): string[] => {
    if (!raw) return [];
    const match = raw.match(/\(([^)]+)\)/);
    if (!match) return [];
    return match[1].split(";").map((g) => g.trim()).filter(Boolean);
  };

  // Ensure groups exist and add contact to them
  const assignGroups = async (contactId: string, groupNames: string[]) => {
    for (const name of groupNames) {
      let group = groups.find((g) => g.name.toLowerCase() === name.toLowerCase());
      if (!group) {
        // Create the group
        const created = await createGroup.mutateAsync(name);
        group = created;
      }
      if (group) {
        await addToGroup.mutateAsync({ contactIds: [contactId], groupId: group.id });
      }
    }
  };

  const downloadTemplate = useCallback(async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([
      [t("contacts.col.company"), t("contacts.col.email"), t("contacts.col.name"), t("contacts.col.industry"), t("contacts.col.groups")],
      ["Acme AS", "ola@acme.no", "Ola Nordmann", "Teknologi", "(Kunde;Lead)"],
      ["Globex AS", "kari@globex.no", "Kari Hansen", "Finans", "(Partner)"],
    ]);
    ws["!cols"] = [{ wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contacts");
    XLSX.writeFile(wb, "sendsafe_contacts_template.xlsx");
  }, [t]);

  const parseFile = useCallback(async (file: File) => {
    try {
      const ext = file.name.split(".").pop()?.toLowerCase();

      let rows: { company: string; contact_email: string; contact_name: string | null; industry: string | null; groupsRaw: string | null }[] = [];

      if (ext === "csv") {
        const text = await file.text();
        const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length < 2) {
          toast.error("CSV file is empty or has no data rows");
          return;
        }
        const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
        const companyIdx = header.findIndex((h) => h.includes("company") || h.includes("selskap") || h.includes("bedrift") || h.includes("firma"));
        const emailIdx = header.findIndex((h) => h.includes("email") || h.includes("e-post") || h.includes("epost"));
        const nameIdx = header.findIndex((h) => h.includes("name") || h.includes("navn"));
        const industryIdx = header.findIndex((h) => h.includes("industry") || h.includes("bransje"));
        const groupsIdx = header.findIndex((h) => h.includes("group") || h.includes("gruppe"));

        if (companyIdx === -1 || emailIdx === -1) {
          toast.error("CSV must have 'company' and 'email' columns");
          return;
        }

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map((c) => c.trim());
          if (cols[emailIdx]) {
            rows.push({
              company: cols[companyIdx] || "",
              contact_email: cols[emailIdx],
              contact_name: nameIdx !== -1 ? cols[nameIdx] || null : null,
              industry: industryIdx !== -1 ? cols[industryIdx] || null : null,
              groupsRaw: groupsIdx !== -1 ? cols[groupsIdx] || null : null,
            });
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
          const companyKey = keys.find((k) => /company|selskap|bedrift|firma/i.test(k));
          const emailKey = keys.find((k) => /email|e-post|epost/i.test(k));
          const nameKey = keys.find((k) => /name|navn/i.test(k));
          const industryKey = keys.find((k) => /industry|bransje/i.test(k));
          const groupsKey = keys.find((k) => /group|gruppe/i.test(k));

          if (companyKey && emailKey && row[emailKey]) {
            rows.push({
              company: row[companyKey] || "",
              contact_email: row[emailKey],
              contact_name: nameKey ? row[nameKey] || null : null,
              industry: industryKey ? row[industryKey] || null : null,
              groupsRaw: groupsKey ? row[groupsKey] || null : null,
            });
          }
        }
      } else {
        toast.error("Unsupported file type. Use .csv, .xlsx, or .xls");
        return;
      }

      if (rows.length === 0) {
        toast.error("No valid contacts found in file");
        return;
      }

      const toImport = rows.map((r) => ({
        company: r.company,
        contact_email: r.contact_email,
        contact_name: r.contact_name,
        industry: r.industry,
        status: "imported" as const,
      }));
      const result = await importLeads.mutateAsync(toImport);
      setImportStats({ imported: result.length, skipped: rows.length - result.length });

      // Assign groups after import
      for (let i = 0; i < result.length; i++) {
        const groupNames = parseGroups(rows[i].groupsRaw);
        if (groupNames.length > 0) {
          await assignGroups(result[i].id, groupNames);
        }
      }
    } catch (err: unknown) {
      console.error("File upload error:", err);
      toast.error("Failed to import contacts");
    }
  }, [importLeads, groups, createGroup, addToGroup]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, [parseFile]);

  const handleManualAdd = async () => {
    const lines = manualInput.split("\n").map((l) => l.trim()).filter(Boolean);
    const parsed = lines.map((line) => {
      // Format: company, email, name, industry, (group1;group2)
      const parts = line.split(",").map((p) => p.trim());
      const groupsPart = parts.find((p) => p.startsWith("("));
      const nonGroupParts = parts.filter((p) => !p.startsWith("("));
      return {
        company: nonGroupParts[0] || "",
        contact_email: nonGroupParts[1] || "",
        contact_name: nonGroupParts[2] || null,
        industry: nonGroupParts[3] || null,
        groupsRaw: groupsPart || null,
        status: "imported" as const,
      };
    }).filter((c) => c.contact_email);

    if (parsed.length === 0) return;

    const toImport = parsed.map(({ groupsRaw, ...rest }) => rest);
    try {
      const result = await importLeads.mutateAsync(toImport);
      // Assign groups
      for (let i = 0; i < result.length; i++) {
        const groupNames = parseGroups(parsed[i].groupsRaw);
        if (groupNames.length > 0) {
          await assignGroups(result[i].id, groupNames);
        }
      }
      setManualInput("");
      setImportStats({ imported: result.length, skipped: 0 });
    } catch {
      toast.error("Failed to add contacts");
    }
  };

  const startEdit = (id: string, field: string, value: string) => {
    setEditingCell({ id, field });
    setEditValue(value);
  };

  const commitEdit = () => {
    if (!editingCell) return;
    const update: Partial<Lead> & { id: string } = { id: editingCell.id };
    if (editingCell.field === "company") update.company = editValue;
    if (editingCell.field === "contact_name") update.contact_name = editValue;
    if (editingCell.field === "contact_email") update.contact_email = editValue;
    if (editingCell.field === "industry") update.industry = editValue;
    updateLead.mutate(update);
    setEditingCell(null);
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    createGroup.mutate(newGroupName.trim(), {
      onSuccess: () => {
        setNewGroupName("");
        setShowCreateGroup(false);
      },
    });
  };

  const handleAddToGroup = (groupId: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    addToGroup.mutate({ contactIds: ids, groupId }, {
      onSuccess: () => {
        setShowAddToGroup(false);
        setSelectedIds(new Set());
      },
    });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">{t("contacts.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("contacts.desc")}</p>
      </div>

      {/* Import section */}
      <div className="mb-8 rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setTab("file")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === "file" ? "bg-primary text-primary-foreground" : "bg-accent text-foreground hover:bg-accent/80"}`}
          >
            {t("contacts.tabFile")}
          </button>
          <button
            onClick={() => setTab("manual")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === "manual" ? "bg-primary text-primary-foreground" : "bg-accent text-foreground hover:bg-accent/80"}`}
          >
            {t("contacts.tabManual")}
          </button>
        </div>

        {tab === "file" ? (
          <div>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="flex flex-col items-center rounded-xl border-2 border-dashed border-border bg-accent/30 px-6 py-12 text-center transition-colors hover:border-primary/30"
            >
              <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">{t("contacts.dragDrop")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("contacts.requiredColumns")}</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) parseFile(file);
                }}
              />
              <div className="mt-4 flex gap-3">
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  <Download className="h-4 w-4" />
                  {t("contacts.downloadTemplate")}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  {t("contacts.browse")}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-3 rounded-lg border border-border bg-accent/20 px-4 py-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">{t("contacts.manualFormat")}</p>
              <code className="text-xs text-foreground">
                {t("contacts.manualExample")}
              </code>
            </div>
            <textarea
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              rows={6}
              placeholder={t("contacts.manualPlaceholder")}
              className="w-full rounded-lg border border-border bg-accent/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={handleManualAdd}
              disabled={!manualInput.trim() || importLeads.isPending}
              className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
            >
              {t("contacts.addContacts")}
            </button>
          </div>
        )}

        {importStats && (
          <div className="mt-4 flex gap-4 text-sm">
            <span className="text-success">{importStats.imported} {t("contacts.imported")}</span>
            {importStats.skipped > 0 && (
              <span className="text-muted-foreground">{importStats.skipped} {t("contacts.skipped")}</span>
            )}
          </div>
        )}
      </div>

      {/* Group management bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={filterGroupId}
          onChange={(e) => setFilterGroupId(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
        >
          <option value="">{t("contacts.filterAll")}</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>

        {filterGroupId && (
          <button
            onClick={() => deleteGroup.mutate(filterGroupId, { onSuccess: () => setFilterGroupId("") })}
            className="rounded-lg border border-destructive/30 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            {t("contacts.deleteGroup")}
          </button>
        )}

        <button
          onClick={() => setShowCreateGroup(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          <Plus className="h-3.5 w-3.5" /> {t("contacts.createGroup")}
        </button>

        {selectedIds.size > 0 && (
          <>
            <span className="text-sm text-muted-foreground">{selectedIds.size} {t("contacts.selected")}</span>
            <button
              onClick={() => setShowAddToGroup(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Users className="h-3.5 w-3.5" /> {t("contacts.addToGroup")}
            </button>
          </>
        )}
      </div>

      {/* Create group dialog */}
      {showCreateGroup && (
        <div className="mb-4 flex items-center gap-2">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder={t("contacts.groupName")}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
            autoFocus
          />
          <button onClick={handleCreateGroup} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">{t("contacts.create")}</button>
          <button onClick={() => { setShowCreateGroup(false); setNewGroupName(""); }} className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">{t("contacts.cancel")}</button>
        </div>
      )}

      {/* Add to group dialog */}
      {showAddToGroup && (
        <div className="mb-4 flex items-center gap-2">
          <select
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
            defaultValue=""
            onChange={(e) => { if (e.target.value) handleAddToGroup(e.target.value); }}
          >
            <option value="" disabled>{t("contacts.selectGroup")}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <button onClick={() => setShowAddToGroup(false)} className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Contact table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          {t("contacts.noContacts")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-accent/50">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredLeads.length && filteredLeads.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("contacts.col.company")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("contacts.col.email")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("contacts.col.name")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("contacts.col.industry")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("contacts.col.groups")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("contacts.col.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(lead.id)}
                      onChange={() => toggleSelect(lead.id)}
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm" onClick={() => startEdit(lead.id, "company", lead.company)}>
                    {editingCell?.id === lead.id && editingCell.field === "company" ? (
                      <input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => e.key === "Enter" && commitEdit()}
                        className="w-full rounded border border-primary bg-card px-2 py-1 text-sm focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <span className="cursor-pointer font-medium text-foreground hover:text-primary">{lead.company}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm" onClick={() => startEdit(lead.id, "contact_email", lead.contact_email)}>
                    {editingCell?.id === lead.id && editingCell.field === "contact_email" ? (
                      <input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => e.key === "Enter" && commitEdit()}
                        className="w-full rounded border border-primary bg-card px-2 py-1 text-sm focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <span className="cursor-pointer text-foreground hover:text-primary">{lead.contact_email}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm" onClick={() => startEdit(lead.id, "contact_name", lead.contact_name || "")}>
                    {editingCell?.id === lead.id && editingCell.field === "contact_name" ? (
                      <input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => e.key === "Enter" && commitEdit()}
                        className="w-full rounded border border-primary bg-card px-2 py-1 text-sm focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <span className="cursor-pointer text-muted-foreground hover:text-primary">{lead.contact_name || "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm" onClick={() => startEdit(lead.id, "industry", lead.industry || "")}>
                    {editingCell?.id === lead.id && editingCell.field === "industry" ? (
                      <input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => e.key === "Enter" && commitEdit()}
                        className="w-full rounded border border-primary bg-card px-2 py-1 text-sm focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <span className="cursor-pointer text-muted-foreground hover:text-primary">{lead.industry || "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {getGroupsForContact(lead.id).map((g) => (
                        <span key={g.id} className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {g.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => deleteLead.mutate(lead.id)}
                      className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
                      title={t("contacts.delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
