import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ArrowRight, Trash2 } from "lucide-react";
import { useCampaignDrafts, useDeleteCampaignDraft } from "@/hooks/use-campaign-drafts";
import { toast } from "sonner";

const toneLabels: Record<string, string> = {
  professional: "Profesjonell",
  friendly: "Vennlig",
  direct: "Direkte",
};

const goalLabels: Record<string, string> = {
  sales: "Salg",
  partnerships: "Partnerskap",
  recruiting: "Rekruttering",
  other: "Annet",
};

const CampaignsPage = () => {
  const navigate = useNavigate();
  const { data: drafts = [], isLoading } = useCampaignDrafts();
  const deleteDraft = useDeleteCampaignDraft();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleNewCampaign = () => {
    navigate("/dashboard/create");
  };

  const handleDelete = (id: string) => {
    if (confirmDeleteId === id) {
      deleteDraft.mutate(id, {
        onSuccess: () => {
          toast.success("Utkast slettet");
          setConfirmDeleteId(null);
        },
      });
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Kampanjer</h1>
          <p className="mt-1 text-sm text-muted-foreground">Fortsett på et utkast eller opprett en ny kampanje</p>
        </div>
        <button
          onClick={handleNewCampaign}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Ny kampanje
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : drafts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <p className="text-sm font-medium text-foreground">Ingen kampanjeutkast ennå</p>
          <p className="mt-1 text-xs text-muted-foreground">Trykk «Ny kampanje» for å komme i gang</p>
          <button
            onClick={handleNewCampaign}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Ny kampanje
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {drafts.map((draft) => {
            const updated = new Date(draft.updated_at).toLocaleDateString("nb-NO", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            return (
              <div
                key={draft.id}
                className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:border-primary/30"
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {draft.name || "Uten navn"}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {draft.contact_ids.length} mottaker{draft.contact_ids.length !== 1 ? "e" : ""}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {toneLabels[draft.tone] ?? draft.tone}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {goalLabels[draft.goal] ?? draft.goal}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">Oppdatert {updated}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDelete(draft.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      confirmDeleteId === draft.id
                        ? "bg-destructive text-destructive-foreground"
                        : "text-muted-foreground hover:text-destructive"
                    }`}
                    title="Slett utkast"
                  >
                    {confirmDeleteId === draft.id ? "Bekreft" : <Trash2 className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => navigate(`/dashboard/create?draft=${draft.id}`)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Fortsett <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CampaignsPage;
