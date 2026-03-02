import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, SUPABASE_FUNCTIONS_URL, SUPABASE_ANON_KEY } from "@/integrations/supabase/client";

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
      const { data: { session } } = await supabase.auth.refreshSession();
      if (!session?.access_token) throw new Error("Not authenticated");
      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/enrich-contacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "apikey": SUPABASE_ANON_KEY,
          "x-user-token": session.access_token,
        },
        body: JSON.stringify({ contact_ids: contactIds }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? data?.message ?? "Enrichment failed");
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}
