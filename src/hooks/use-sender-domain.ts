import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SenderDomain } from "@/types/database";

async function callSenderDomain(action: string, domain: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await supabase.functions.invoke("sender-domain", {
    body: { action, domain },
  });

  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export function useSenderDomain(senderEmail: string | null | undefined) {
  const domain = senderEmail?.split("@")[1] ?? null;

  return useQuery({
    queryKey: ["sender-domain", domain],
    queryFn: async (): Promise<SenderDomain | null> => {
      if (!domain) return null;
      try {
        const data = await callSenderDomain("view", domain);
        // SMTP2GO returns domain info in data.domain or at top level
        const d = data.data?.domain ?? data.domain;
        if (!d) return null;
        return d as SenderDomain;
      } catch {
        // Domain API may be unavailable (e.g. API key lacks permission)
        return null;
      }
    },
    enabled: !!domain,
    staleTime: 30_000,
    retry: false,
  });
}

export function useAddSenderDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (domain: string) => {
      return callSenderDomain("add", domain);
    },
    onSuccess: (_data, domain) => {
      queryClient.invalidateQueries({ queryKey: ["sender-domain", domain] });
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
