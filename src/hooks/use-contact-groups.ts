import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ContactGroup, ContactGroupMembership } from "@/types/database";

export function useContactGroups() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["contact-groups"],
    queryFn: async (): Promise<ContactGroup[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("contact_groups")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ContactGroup[];
    },
    enabled: !!user,
  });
}

export function useCreateContactGroup() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("contact_groups")
        .insert({ name, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as ContactGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-groups"] });
    },
  });
}

export function useDeleteContactGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from("contact_groups")
        .delete()
        .eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-groups"] });
      queryClient.invalidateQueries({ queryKey: ["group-memberships"] });
    },
  });
}

export function useGroupMemberships(groupId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["group-memberships", groupId ?? "all"],
    queryFn: async (): Promise<ContactGroupMembership[]> => {
      if (!user) return [];
      let query = supabase.from("contact_group_memberships").select("*");
      if (groupId) {
        query = query.eq("group_id", groupId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as ContactGroupMembership[];
    },
    enabled: !!user,
  });
}

export function useAddToGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactIds, groupId }: { contactIds: string[]; groupId: string }) => {
      const rows = contactIds.map((contact_id) => ({ contact_id, group_id: groupId }));
      const { data, error } = await supabase
        .from("contact_group_memberships")
        .upsert(rows, { onConflict: "contact_id,group_id" })
        .select();
      if (error) throw error;
      return data as ContactGroupMembership[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-memberships"] });
    },
  });
}

export function useRemoveFromGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactId, groupId }: { contactId: string; groupId: string }) => {
      const { error } = await supabase
        .from("contact_group_memberships")
        .delete()
        .eq("contact_id", contactId)
        .eq("group_id", groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-memberships"] });
    },
  });
}
