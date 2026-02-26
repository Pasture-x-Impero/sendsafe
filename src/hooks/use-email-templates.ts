import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { EmailTemplate } from "@/types/database";

export function useEmailTemplates() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["email-templates"],
    queryFn: async (): Promise<EmailTemplate[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as EmailTemplate[];
    },
    enabled: !!user,
  });
}

export function useCreateEmailTemplate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (template: { name: string; subject: string; body: string; language: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("email_templates")
        .insert({ ...template, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as EmailTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
    },
  });
}

export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("email_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
    },
  });
}
