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

      // Ensure the latest session token is set before invoking
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) supabase.functions.setAuth(session.access_token);

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
          const ctx = error.context as Response;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            message = body.error ?? body.message ?? message;
          } else if (error.message && error.message !== "Edge Function returned a non-2xx status code") {
            message = error.message;
          }
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
