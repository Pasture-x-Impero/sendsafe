import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, SUPABASE_FUNCTIONS_URL, SUPABASE_ANON_KEY } from "@/integrations/supabase/client";
import type { Email } from "@/types/database";

export type CreateMode = "hybrid";

interface GenerateEmailsInput {
  contactIds: string[];
  mode: CreateMode;
  campaignName: string;
  tone?: string;
  goal?: string;
  language?: string;
  templateSubject: string;
  templateBody: string;
}

export function useGenerateEmails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactIds, campaignName, tone, goal, language, templateSubject, templateBody }: GenerateEmailsInput) => {
      const campaignId = crypto.randomUUID();

      const { data: { session } } = await supabase.auth.refreshSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/generate-emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "apikey": SUPABASE_ANON_KEY,
          "x-user-token": session.access_token,
        },
        body: JSON.stringify({
          contact_ids: contactIds,
          campaign_name: campaignName,
          campaign_id: campaignId,
          template_subject: templateSubject,
          template_body: templateBody,
          tone: tone || "professional",
          goal: goal || "sales",
          language: language || "no",
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? body.message ?? "Failed to generate emails");
      }

      const data = await response.json();
      if (data?.error) throw new Error(data.error);

      return data.emails as Email[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
    },
  });
}
