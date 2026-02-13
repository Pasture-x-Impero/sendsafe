import { useRef } from "react";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useLeads, useImportLeads } from "@/hooks/use-leads";

function parseCsv(text: string) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const companyIdx = headers.findIndex((h) => h.includes("company"));
  const emailIdx = headers.findIndex((h) => h.includes("email"));
  const nameIdx = headers.findIndex((h) => h.includes("name") && !h.includes("company"));

  if (companyIdx === -1 || emailIdx === -1) return [];

  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const company = cols[companyIdx] || "";
    const contact_email = cols[emailIdx] || "";
    const contact_name = nameIdx !== -1 ? cols[nameIdx] || null : null;
    const valid = company && contact_email.includes("@");
    return {
      company,
      contact_email,
      contact_name,
      status: valid ? ("imported" as const) : ("skipped" as const),
    };
  });
}

const LeadsPage = () => {
  const { t } = useLanguage();
  const { data: leads = [], isLoading } = useLeads();
  const importLeads = useImportLeads();
  const fileRef = useRef<HTMLInputElement>(null);

  const importedCount = leads.filter((l) => l.status === "imported").length;
  const skippedCount = leads.filter((l) => l.status === "skipped").length;

  const handleFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length > 0) {
      await importLeads.mutateAsync(parsed);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleBrowse = () => {
    fileRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">{t("leads.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("leads.desc")}</p>
      </div>

      <div
        className="mb-8 flex flex-col items-center rounded-xl border-2 border-dashed border-border bg-accent/30 px-6 py-10 text-center transition-colors hover:border-primary/30"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">{t("leads.dragDrop")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("leads.requiredColumns")}</p>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleInputChange} />
        <button
          onClick={handleBrowse}
          disabled={importLeads.isPending}
          className="mt-4 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
        >
          {t("leads.browse")}
        </button>
      </div>

      {leads.length > 0 && (
        <div className="mb-6 flex gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-success/10 px-4 py-2">
            <CheckCircle className="h-4 w-4 text-success" />
            <span className="text-sm font-medium text-success">{importedCount} {t("leads.imported")}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-warning/10 px-4 py-2">
            <AlertCircle className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium text-warning">{skippedCount} {t("leads.skipped")}</span>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : leads.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-accent/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("leads.col.company")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("leads.col.contact")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("leads.col.status")}</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{lead.company}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{lead.contact_email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      lead.status === "imported" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                    }`}>
                      {lead.status === "imported" ? t("leads.imported") : t("leads.skipped")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
};

export default LeadsPage;
