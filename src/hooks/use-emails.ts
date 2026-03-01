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
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) supabase.functions.setAuth(session.access_token);
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

export function useDeleteEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (emailId: string) => {
      const { error } = await supabase
        .from("emails")
        .delete()
        .eq("id", emailId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
    },
  });
}

/** Returns sent-email counts keyed by contact_email (covers all campaigns, incl. those with no lead_id). */
export function useSentEmailCounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["sent-email-counts"],
    queryFn: async (): Promise<Map<string, number>> => {
      if (!user) return new Map();
      const { data, error } = await supabase
        .from("emails")
        .select("contact_email")
        .eq("user_id", user.id)
        .eq("status", "sent");
      if (error) throw error;
      const counts = new Map<string, number>();
      for (const row of data) {
        const key = row.contact_email?.toLowerCase();
        if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return counts;
    },
    enabled: !!user,
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
