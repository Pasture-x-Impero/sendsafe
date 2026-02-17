import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Lead, Email } from "@/types/database";

export type CreateMode = "ai" | "standard";

interface GenerateEmailsInput {
  contactIds: string[];
  contacts: Lead[];
  mode: CreateMode;
  campaignName: string;
  // AI mode
  tone?: string;
  goal?: string;
  instructions?: string;
  // Standard mode
  templateSubject?: string;
  templateBody?: string;
}

function generateMockEmail(contact: Lead, instructions: string): { subject: string; body: string } {
  const name = contact.contact_name || "there";
  const company = contact.company;

  const subject = `Quick note for ${company}`;
  const body = `Hi ${name},\n\nI wanted to reach out regarding ${company}.\n\n${instructions}\n\nI'd love to set up a quick call to discuss how we can work together.\n\nBest regards`;

  return { subject, body };
}

function generateStandardEmail(
  contact: Lead,
  templateSubject: string,
  templateBody: string
): { subject: string; body: string } {
  const name = contact.contact_name || "";
  const firstName = name.split(" ")[0] || "Hei";
  const greeting = `Hei ${firstName},`;
  return {
    subject: templateSubject,
    body: `${greeting}\n\n${templateBody}`,
  };
}

const PLAN_AI_LIMITS: Record<string, number> = { free: 0, starter: 100, pro: 500 };

export function useGenerateEmails() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactIds, contacts, mode, campaignName, tone, goal, instructions, templateSubject, templateBody }: GenerateEmailsInput) => {
      if (!user) throw new Error("Not authenticated");

      // Check AI credit limit for AI mode
      if (mode === "ai") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("plan")
          .eq("id", user.id)
          .single();

        const plan = profile?.plan ?? "free";
        const aiLimit = PLAN_AI_LIMITS[plan] ?? 0;

        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const { count: aiUsed } = await supabase
          .from("emails")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("generation_mode", "ai")
          .gte("created_at", startOfMonth);

        const remaining = aiLimit - (aiUsed ?? 0);
        if (contactIds.length > remaining) {
          throw new Error(
            remaining <= 0
              ? "Monthly AI credit limit reached. Upgrade your plan for more AI credits."
              : `Only ${remaining} AI credits remaining this month. Select fewer contacts or upgrade your plan.`
          );
        }
      }

      const campaignId = crypto.randomUUID();
      const selectedContacts = contacts.filter((c) => contactIds.includes(c.id));

      const emailRows = selectedContacts.map((contact) => {
        const { subject, body } =
          mode === "ai"
            ? generateMockEmail(contact, instructions || "")
            : generateStandardEmail(contact, templateSubject || "", templateBody || "");

        return {
          user_id: user.id,
          lead_id: contact.id,
          company: contact.company,
          contact_name: contact.contact_name || "",
          contact_email: contact.contact_email,
          subject,
          body,
          confidence: 0,
          status: "draft" as const,
          approved: false,
          issues: [] as string[],
          suggestions: null,
          campaign_id: campaignId,
          campaign_name: campaignName,
          generation_mode: mode,
        };
      });

      const { data, error } = await supabase
        .from("emails")
        .insert(emailRows)
        .select();
      if (error) throw error;
      return data as Email[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
    },
  });
}
