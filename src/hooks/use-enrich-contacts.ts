import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface EnrichResult {
  id: string;
  contact_name: string | null;
  contact_email: string | null;
  domain: string | null;
  success: boolean;
}

export function useEnrichContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactIds: string[]): Promise<{ results: EnrichResult[]; credits_used: number }> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");
      const { data, error } = await supabase.functions.invoke("enrich-contacts", {
        body: { contact_ids: contactIds },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw new Error(error.message || "Enrichment failed");
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}
