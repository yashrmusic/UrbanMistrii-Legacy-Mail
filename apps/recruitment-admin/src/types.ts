export type PortalConfig = {
  portalEnabled?: boolean;
  provider?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  emailRedirectTo?: string;
  supportEmail?: string;
  allowedEmailDomains?: string[];
  portalMode?: string;
};

export type Candidate = {
  id: string;
  application_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  position: string;
  experience: string | null;
  current_employer: string | null;
  portfolio_url: string | null;
  linkedin_url: string | null;
  resume_url: string | null;
  available_from: string | null;
  expected_salary: string | null;
  notice_period: string | null;
  relocation_status: string | null;
  cover_letter: string | null;
  status: string;
  public_status: string;
  public_status_message: string | null;
  internal_notes: string | null;
  application_date: string;
  updated_at: string;
  archived: boolean;
  archived_at: string | null;
  hired_at: string | null;
};

export const STATUS_OPTIONS = [
  "Applied",
  "Reviewing",
  "Assignment Sent",
  "Assignment Submitted",
  "Interview Scheduled",
  "Offer Extended",
  "Rejected",
  "Talent Pool",
  "Hired",
] as const;

export const POSITIONS = [
  "Architect",
  "Junior Architect",
  "Interior Designer",
  "Visualizer",
  "Project Manager",
  "Growth & Marketing",
  "Internship",
] as const;

export const ACTIONS = [
  { value: "review", label: "Review Application", style: "primary" },
  { value: "send_test", label: "Send Assignment", style: "primary" },
  { value: "schedule_interview", label: "Schedule Interview", style: "primary" },
  { value: "extend_offer", label: "Extend Offer", style: "highlight" },
  { value: "reject", label: "Reject Candidate", style: "danger" },
  { value: "talent_pool", label: "Move to Talent Pool", style: "secondary" },
  { value: "hire", label: "Hire Candidate", style: "highlight" },
] as const;

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Applied: { bg: "rgba(17,17,17,0.06)", text: "#111" },
  Reviewing: { bg: "rgba(82,98,85,0.12)", text: "#4a6a5a" },
  "Assignment Sent": { bg: "rgba(143,110,82,0.12)", text: "#8f6e52" },
  "Assignment Submitted": { bg: "rgba(143,110,82,0.12)", text: "#8f6e52" },
  "Interview Scheduled": { bg: "rgba(82,98,85,0.12)", text: "#4a6a5a" },
  "Offer Extended": { bg: "rgba(82,98,85,0.16)", text: "#4a6a5a" },
  Rejected: { bg: "rgba(17,17,17,0.04)", text: "#616161" },
  "Talent Pool": { bg: "rgba(143,110,82,0.1)", text: "#8f6e52" },
  Hired: { bg: "rgba(82,98,85,0.16)", text: "#4a6a5a" },
};
