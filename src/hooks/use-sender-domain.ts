import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SenderDomain } from "@/types/database";

async function callSenderDomain(action: string, domain: string) {
  // Force a session refresh to get a valid access token
  const { data: { session } } = await supabase.auth.refreshSession();
  if (!session?.access_token) throw new Error("Not authenticated");

  const res = await supabase.functions.invoke("sender-domain", {
    body: { action, domain },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (res.error) throw new Error(res.error.message);
  return res.data;
}

function parseDomainResponse(data: unknown): SenderDomain | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;

  // SMTP2GO can return domain info at different nesting levels
  const d =
    (obj.data as Record<string, unknown>)?.domain ??
    obj.domain ??
    // Some endpoints return the domain fields at the top of data
    obj.data ??
    obj;

  if (!d || typeof d !== "object") return null;
  const domain = d as Record<string, unknown>;

  // Must have at least a dkim_selector to be valid domain info
  if (!domain.dkim_selector && !domain.dkim_value) return null;

  return domain as unknown as SenderDomain;
}

export function useSenderDomain(senderEmail: string | null | undefined) {
  const domain = senderEmail?.split("@")[1] ?? null;

  return useQuery({
    queryKey: ["sender-domain", domain],
    queryFn: async (): Promise<SenderDomain | null> => {
      if (!domain) return null;
      try {
        const data = await callSenderDomain("view", domain);
        return parseDomainResponse(data);
      } catch (err) {
        console.error("Domain view failed:", err);
        return null;
      }
    },
    enabled: !!domain,
    staleTime: 10_000,
    retry: 1,
  });
}

export function useAddSenderDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (domain: string) => {
      return callSenderDomain("add", domain);
    },
    onSuccess: (_data, domain) => {
      // Wait briefly for SMTP2GO to process, then refetch
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["sender-domain", domain] });
      }, 1500);
    },
  });
}

export function useVerifySenderDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (domain: string) => {
      return callSenderDomain("verify", domain);
    },
    onSuccess: (_data, domain) => {
      queryClient.invalidateQueries({ queryKey: ["sender-domain", domain] });
    },
  });
}
