export const PHASE_19_PROCESS_ORDER_TABLES = [
  "process_orders",
  "process_order_items",
  "process_order_tasks",
  "process_order_events",
] as const;

export const PHASE_23_PAYMENT_TABLES = ["payment_events"] as const;

export const PHASE_24_SHIPMENT_TABLES = ["shipment_events"] as const;
export const TASK_D_AUTH_TABLES = [
  "company_memberships",
  "internal_user_profiles",
] as const;

export const PHASE_23_PAYMENT_COLUMNS = [
  "provider_payment_id",
  "provider_transaction_id",
  "payment_url",
  "payment_qr_url",
  "payment_qr_data_url",
  "payment_qr_string",
  "payment_method",
  "payment_channel",
  "unique_code",
  "expired_at",
  "failed_at",
  "cancelled_at",
  "callback_received_at",
  "callback_status",
  "callback_reference",
  "callback_amount",
  "callback_raw_safe_json",
  "invoice_document_id",
] as const;

export const PHASE_24_SHIPMENT_COLUMNS = [
  "shipment_number",
  "process_order_id",
  "tracking_url",
  "shipping_cost",
  "recipient_name",
  "recipient_phone",
  "destination_address_json",
  "shipped_at",
  "delivered_at",
  "failed_at",
  "created_by",
  "notes",
  "deleted_at",
] as const;

export const CUSTOMER_COMPANY_PROFILE_COLUMNS = [
  "phone",
  "pic_name",
  "pic_email",
  "pic_whatsapp",
  "profile_completed_at",
] as const;

export const CUSTOMER_ADDRESS_COLUMNS = [
  "is_default_shipping",
  "is_default_billing",
] as const;

export const TASK_E_CARRIER_SHIPPING_TABLES = [
  "shipping_quotes",
  "shipping_shipments",
  "shipping_events",
] as const;

export const TASK_G1_GINEE_TABLES = [
  "ginee_product_mappings",
  "ginee_inventory_snapshots",
] as const;

// Added to schema checks after migration 022 is applied in the target
// environment. Kept separate so an unapplied migration does not incorrectly
// take the existing staging health endpoint offline.
export const WOO_STOCK_MONITORING_TABLES = [
  "production_replenishment_requests",
] as const;

export const REQUIRED_SUPABASE_TABLES = [
  "companies",
  "user_profiles",
  "company_users",
  ...TASK_D_AUTH_TABLES,
  "quotations",
  "quotation_items",
  "email_logs",
  "uploaded_files",
  "company_logos",
  "audit_logs",
  "orders",
  "payments",
  "shipments",
  "tracking_records",
  ...PHASE_19_PROCESS_ORDER_TABLES,
  ...PHASE_23_PAYMENT_TABLES,
  ...PHASE_24_SHIPMENT_TABLES,
  "embroidery_pricing_zones",
  "admin_notifications",
] as const;

export type RequiredSupabaseTable = (typeof REQUIRED_SUPABASE_TABLES)[number];
export type Phase23PaymentColumn = (typeof PHASE_23_PAYMENT_COLUMNS)[number];
export type Phase24ShipmentColumn = (typeof PHASE_24_SHIPMENT_COLUMNS)[number];
