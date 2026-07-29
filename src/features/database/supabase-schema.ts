export const PHASE_19_PROCESS_ORDER_TABLES = [
  "process_orders",
  "process_order_items",
  "process_order_tasks",
  "process_order_events",
] as const;

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
  ...PHASE_19_PROCESS_ORDER_TABLES,
] as const;

export type RequiredSupabaseTable = (typeof REQUIRED_SUPABASE_TABLES)[number];
