import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Lead } from "@/types/database";

export function useLeads() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["leads"],
    queryFn: async (): Promise<Lead[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!user,
  });
}

export function useImportLeads() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leads: Pick<Lead, "company" | "contact_email" | "contact_name" | "status">[]) => {
      if (!user) throw new Error("Not authenticated");
      const rows = leads.map((l) => ({ ...l, user_id: user.id }));
      const { data, error } = await supabase
        .from("leads")
        .insert(rows)
        .select();
      if (error) throw error;
      return data as Lead[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}
