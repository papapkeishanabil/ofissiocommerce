export const PHASE_19_PROCESS_ORDER_TABLES = [
  "process_orders",
  "process_order_items",
  "process_order_tasks",
  "process_order_events",
] as const;

export const PHASE_23_PAYMENT_TABLES = ["payment_events"] as const;

export const PHASE_24_SHIPMENT_TABLES = ["shipment_events"] as const;

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
  "shipments",
  "tracking_records",
  ...PHASE_19_PROCESS_ORDER_TABLES,
  ...PHASE_23_PAYMENT_TABLES,
  ...PHASE_24_SHIPMENT_TABLES,
  "embroidery_pricing_zones",
] as const;

export type RequiredSupabaseTable = (typeof REQUIRED_SUPABASE_TABLES)[number];
export type Phase23PaymentColumn = (typeof PHASE_23_PAYMENT_COLUMNS)[number];
export type Phase24ShipmentColumn = (typeof PHASE_24_SHIPMENT_COLUMNS)[number];
