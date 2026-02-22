import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Lead, Email } from "@/types/database";

export type CreateMode = "hybrid";

interface GenerateEmailsInput {
  contactIds: string[];
  contacts: Lead[];
  mode: CreateMode;
  campaignName: string;
  tone?: string;
  goal?: string;
  templateSubject: string;
  templateBody: string;
}

function generateHybridEmail(
  contact: Lead,
  templateSubject: string,
  templateBody: string,
): { subject: string; body: string } {
  const name = contact.contact_name || "";
  const firstName = name.split(" ")[0] || "";
  const company = contact.company;
  const industry = contact.industry || "";

  const fillSlot = (instruction: string): string => {
    const lower = instruction.toLowerCase();
    if (lower.includes("fornavn") || lower.includes("first name")) return firstName || name;
    if (lower.includes("navn") || lower.includes("name")) return name || firstName;
    if (lower.includes("selskap") || lower.includes("bedrift") || lower.includes("company")) return company;
    if (lower.includes("bransje") || lower.includes("industry")) return industry;
    // For all other slots: return instruction as-is (real impl would call AI here)
    return instruction;
  };

  const fill = (text: string) =>
    text.replace(/\[([^\]]+)\]/g, (_, instr) => fillSlot(instr.trim()));

  return {
    subject: fill(templateSubject),
    body: fill(templateBody),
  };
}

const PLAN_AI_LIMITS: Record<string, number> = { free: 0, starter: 100, pro: 500 };

export function useGenerateEmails() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactIds, contacts, mode, campaignName, tone, goal, templateSubject, templateBody }: GenerateEmailsInput) => {
      if (!user) throw new Error("Not authenticated");

      // Check AI credit limit
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .single();

      const plan = profile?.plan ?? "free";
      const aiLimit = PLAN_AI_LIMITS[plan] ?? 0;

      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { count: aiEmails } = await supabase
        .from("emails")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("generation_mode", "hybrid")
        .gte("created_at", startOfMonth);
      const { count: enrichments } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .not("enriched_at", "is", null)
        .gte("enriched_at", startOfMonth);

      const remaining = aiLimit - ((aiEmails ?? 0) + (enrichments ?? 0));
      if (contactIds.length > remaining) {
        throw new Error(
          remaining <= 0
            ? "Monthly AI credit limit reached. Upgrade your plan for more AI credits."
            : `Only ${remaining} AI credits remaining this month. Select fewer contacts or upgrade your plan.`
        );
      }

      const campaignId = crypto.randomUUID();
      const selectedContacts = contacts.filter((c) => contactIds.includes(c.id));

      const emailRows = selectedContacts.map((contact) => {
        const { subject, body } = generateHybridEmail(contact, templateSubject, templateBody);

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
