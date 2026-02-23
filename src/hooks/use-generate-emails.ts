import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

      const { data, error } = await supabase.functions.invoke("generate-emails", {
        body: {
          contact_ids: contactIds,
          campaign_name: campaignName,
          campaign_id: campaignId,
          template_subject: templateSubject,
          template_body: templateBody,
          tone: tone || "professional",
          goal: goal || "sales",
          language: language || "no",
        },
      });

      if (error) {
        let message = "Failed to generate emails";
        try {
          const body = await (error.context as Response).json();
          message = body.error ?? message;
        } catch { /* use default message */ }
        throw new Error(message);
      }

      if (data?.error) throw new Error(data.error);

      return data.emails as Email[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
    },
  });
}
