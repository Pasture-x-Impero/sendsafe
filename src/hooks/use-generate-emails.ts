import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Lead, Email } from "@/types/database";

interface GenerateEmailsInput {
  contactIds: string[];
  instructions: string;
  contacts: Lead[];
}

function generateMockEmail(contact: Lead, instructions: string): { subject: string; body: string } {
  const name = contact.contact_name || "there";
  const company = contact.company;

  const subject = `Quick note for ${company}`;
  const body = `Hi ${name},\n\nI wanted to reach out regarding ${company}.\n\n${instructions}\n\nI'd love to set up a quick call to discuss how we can work together.\n\nBest regards`;

  return { subject, body };
}

export function useGenerateEmails() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactIds, instructions, contacts }: GenerateEmailsInput) => {
      if (!user) throw new Error("Not authenticated");

      const campaignId = crypto.randomUUID();
      const selectedContacts = contacts.filter((c) => contactIds.includes(c.id));

      const emailRows = selectedContacts.map((contact) => {
        const { subject, body } = generateMockEmail(contact, instructions);
        return {
          user_id: user.id,
          lead_id: contact.id,
          company: contact.company,
          contact_name: contact.contact_name || "",
          contact_email: contact.contact_email,
          subject,
          body,
          confidence: Math.floor(Math.random() * 21) + 80, // 80-100
          status: "draft" as const,
          approved: false,
          issues: [] as string[],
          suggestions: null,
          campaign_id: campaignId,
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
