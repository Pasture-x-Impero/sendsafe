import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Email } from "@/types/database";

export function useEmails(statusFilter: string | string[]) {
  const { user } = useAuth();
  const statuses = Array.isArray(statusFilter) ? statusFilter : [statusFilter];

  return useQuery({
    queryKey: ["emails", ...statuses],
    queryFn: async (): Promise<Email[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("emails")
        .select("*")
        .eq("user_id", user.id)
        .in("status", statuses)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Email[];
    },
    enabled: !!user,
  });
}

export function useApproveEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (emailId: string) => {
      const { data, error } = await supabase
        .from("emails")
        .update({ approved: true, status: "approved" })
        .eq("id", emailId)
        .select()
        .single();
      if (error) throw error;
      return data as Email;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
    },
  });
}

export function useApproveAllEmails() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("emails")
        .update({ approved: true, status: "approved" })
        .eq("user_id", user.id)
        .in("status", ["draft", "needs_review"])
        .select();
      if (error) throw error;
      return data as Email[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
    },
  });
}

export function useSendEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ emailId, testEmail }: { emailId: string; testEmail?: string }) => {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: { email_id: emailId, test_email: testEmail },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
    },
  });
}

export function useUpdateEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Email> & { id: string }) => {
      const { data, error } = await supabase
        .from("emails")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Email;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
    },
  });
}
