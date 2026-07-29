export const REQUIRED_SUPABASE_TABLES = [
  "companies",
  "user_profiles",
  "company_users",
  "quotations",
  "quotation_items",
  "email_logs",
  "uploaded_files",
  "company_logos",
  "audit_logs",
  "orders",
  "payments",
  "tracking_records",
] as const;

export type RequiredSupabaseTable = (typeof REQUIRED_SUPABASE_TABLES)[number];
