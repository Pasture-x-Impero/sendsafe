import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";

const LeadsPage = () => {
  const mockLeads = [
    { company: "Acme Corp", contact: "sarah@acme.com", status: "imported" },
    { company: "Globex Inc", contact: "john@globex.com", status: "imported" },
    { company: "Initech", contact: "mike@initech.com", status: "imported" },
    { company: "Umbrella Co", contact: "lisa@umbrella.com", status: "skipped" },
    { company: "Stark Industries", contact: "tony@stark.com", status: "imported" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">Leads</h1>
        <p className="mt-1 text-sm text-muted-foreground">Upload and manage your contact lists.</p>
      </div>

      {/* Upload area */}
      <div className="mb-8 flex flex-col items-center rounded-xl border-2 border-dashed border-border bg-accent/30 px-6 py-10 text-center transition-colors hover:border-primary/30">
        <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Drag & drop Excel or CSV file</p>
        <p className="mt-1 text-xs text-muted-foreground">Required columns: company name, contact email</p>
        <button className="mt-4 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
          Browse files
        </button>
      </div>

      {/* Import summary */}
      <div className="mb-6 flex gap-4">
        <div className="flex items-center gap-2 rounded-lg bg-success/10 px-4 py-2">
          <CheckCircle className="h-4 w-4 text-success" />
          <span className="text-sm font-medium text-success">4 imported</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-warning/10 px-4 py-2">
          <AlertCircle className="h-4 w-4 text-warning" />
          <span className="text-sm font-medium text-warning">1 skipped</span>
        </div>
      </div>

      {/* Leads table */}
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-accent/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {mockLeads.map((lead, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-sm font-medium text-foreground">{lead.company}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{lead.contact}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    lead.status === "imported"
                      ? "bg-success/10 text-success"
                      : "bg-warning/10 text-warning"
                  }`}>
                    {lead.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeadsPage;
