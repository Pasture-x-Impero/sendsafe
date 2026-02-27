import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { CampaignDraft } from "@/types/database";

export function useCampaignDrafts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["campaign_drafts"],
    queryFn: async (): Promise<CampaignDraft[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("campaign_drafts")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as CampaignDraft[];
    },
    enabled: !!user,
  });
}

export function useCreateCampaignDraft() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (draft: Partial<CampaignDraft> = {}) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("campaign_drafts")
        .insert({ ...draft, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as CampaignDraft;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaign_drafts"] }),
  });
}

export function useUpdateCampaignDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CampaignDraft> & { id: string }) => {
      const { data, error } = await supabase
        .from("campaign_drafts")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as CampaignDraft;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaign_drafts"] }),
  });
}

export function useDeleteCampaignDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("campaign_drafts")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaign_drafts"] }),
  });
}
