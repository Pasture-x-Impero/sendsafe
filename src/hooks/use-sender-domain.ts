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
  const dataObj = obj.data as Record<string, unknown> | undefined;

  // SMTP2GO view returns: { data: { domains: [{ domain: { dkim_selector, ... }, trackers: [...] }] } }
  // SMTP2GO add returns:  { data: { domain: "x", dkim_selector: "...", ... } }
  // We need to find the object with dkim_selector and merge trackers

  let domainObj: Record<string, unknown> | null = null;
  let trackersRaw: unknown[] = [];

  if (dataObj && typeof dataObj === "object") {
    // View: data.domains[0].domain + data.domains[0].trackers
    if (Array.isArray(dataObj.domains) && dataObj.domains.length > 0) {
      const entry = dataObj.domains[0] as Record<string, unknown>;
      if (entry.domain && typeof entry.domain === "object") {
        domainObj = entry.domain as Record<string, unknown>;
      } else if (entry.dkim_selector) {
        domainObj = entry;
      }
      if (Array.isArray(entry.trackers)) {
        trackersRaw = entry.trackers;
      }
    }
    // Add/verify: data.domain is a string, fields at data level
    if (!domainObj && dataObj.dkim_selector) {
      domainObj = dataObj;
    }
    // data.domain as nested object
    if (!domainObj && dataObj.domain && typeof dataObj.domain === "object") {
      domainObj = dataObj.domain as Record<string, unknown>;
    }
  }

  if (!domainObj) {
    console.warn("parseDomainResponse: could not find domain info in", JSON.stringify(data).slice(0, 500));
    return null;
  }

  // Normalize trackers: SMTP2GO uses fulldomain/subdomain + cname_verified
  const trackers = trackersRaw.map((t) => {
    const tr = t as Record<string, unknown>;
    return {
      subdomain: (tr.fulldomain || tr.subdomain || "") as string,
      verification_status: tr.cname_verified ? "verified" : "pending",
    };
  });

  return {
    domain: (domainObj.fulldomain || domainObj.domain || "") as string,
    dkim_selector: (domainObj.dkim_selector || "") as string,
    dkim_value: (domainObj.dkim_value || domainObj.dkim_expected || "") as string,
    dkim_verified: !!domainObj.dkim_verified,
    rpath_selector: (domainObj.rpath_selector || "") as string,
    rpath_verified: !!domainObj.rpath_verified,
    trackers,
  } as SenderDomain;
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
