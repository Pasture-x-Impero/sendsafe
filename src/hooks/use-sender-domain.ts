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

  // Try to find domain info — SMTP2GO responses vary by endpoint:
  // - add:    { data: { domain: "x", dkim_selector: "...", ... } }
  // - view:   { data: { domains: [ { domain: "x", ... } ] } } or { data: { domain: { ... } } }
  // - verify: { data: { domain: "x", ... } }
  const candidates: unknown[] = [];

  const dataObj = obj.data as Record<string, unknown> | undefined;
  if (dataObj && typeof dataObj === "object") {
    // Check data.domains array (view endpoint)
    if (Array.isArray(dataObj.domains) && dataObj.domains.length > 0) {
      candidates.push(dataObj.domains[0]);
    }
    // Check data.domain as object
    if (dataObj.domain && typeof dataObj.domain === "object") {
      candidates.push(dataObj.domain);
    }
    // Check data itself (add/verify: fields at data level)
    candidates.push(dataObj);
  }
  // Check top-level domain object
  if (obj.domain && typeof obj.domain === "object") {
    candidates.push(obj.domain);
  }
  // Check top level
  candidates.push(obj);

  for (const c of candidates) {
    if (!c || typeof c !== "object") continue;
    const rec = c as Record<string, unknown>;
    if (rec.dkim_selector || rec.dkim_value) {
      return rec as unknown as SenderDomain;
    }
  }

  console.warn("parseDomainResponse: could not find domain info in", JSON.stringify(data));
  return null;
}

export function useSenderDomain(senderEmail: string | null | undefined) {
  const domain = senderEmail?.split("@")[1] ?? null;

  return useQuery({
    queryKey: ["sender-domain", domain],
    queryFn: async (): Promise<SenderDomain | null> => {
      if (!domain) return null;
      try {
        const data = await callSenderDomain("view", domain);
        console.log("Domain view raw response:", JSON.stringify(data));
        const parsed = parseDomainResponse(data);
        console.log("Domain view parsed:", parsed);
        return parsed;
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
    onSuccess: (data, domain) => {
      // Try to seed cache directly from the add response
      const parsed = parseDomainResponse(data);
      if (parsed) {
        queryClient.setQueryData(["sender-domain", domain], parsed);
      }
      // Also refetch after delay in case SMTP2GO needs time to process
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["sender-domain", domain] });
      }, 3000);
    },
  });
}

export function useVerifySenderDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (domain: string) => {
      return callSenderDomain("verify", domain);
    },
    onSuccess: (data, domain) => {
      // Update cache from verify response
      const parsed = parseDomainResponse(data);
      if (parsed) {
        queryClient.setQueryData(["sender-domain", domain], parsed);
      }
      // Also refetch to ensure fresh data
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["sender-domain", domain] });
      }, 2000);
    },
  });
}
