export interface Profile {
  id: string;
  tone: "professional" | "friendly" | "direct";
  goal: "sales" | "partnerships" | "recruiting" | "other";
  autosend_threshold: number;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  user_id: string;
  company: string;
  contact_email: string;
  contact_name: string | null;
  status: "imported" | "skipped";
  created_at: string;
}

export interface Email {
  id: string;
  user_id: string;
  lead_id: string | null;
  company: string;
  contact_name: string;
  contact_email: string;
  subject: string;
  body: string;
  confidence: number;
  status: "draft" | "needs_review" | "approved" | "sent";
  approved: boolean;
  issues: string[];
  suggestions: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}
