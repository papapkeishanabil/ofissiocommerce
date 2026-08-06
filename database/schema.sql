-- Ofissio Phase 11 database schema draft.
-- Target: Supabase Postgres / Postgres.
-- This is a foundation draft; review before running in production.

create extension if not exists pgcrypto;

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  industry text,
  employee_count integer check (employee_count is null or employee_count >= 0),
  npwp text,
  phone text,
  pic_name text,
  pic_email text,
  pic_whatsapp text,
  profile_completed_at timestamptz,
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid,
  name text not null,
  email text not null unique,
  whatsapp text,
  status text not null default 'active' check (status in ('active', 'inactive', 'invited')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists company_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references user_profiles(id) on delete cascade,
  role text not null check (role in ('company_admin', 'purchasing', 'approver', 'finance', 'viewer')),
  status text not null default 'active' check (status in ('active', 'inactive', 'invited')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create table if not exists company_addresses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  label text not null,
  recipient_name text not null,
  phone text not null,
  address_line text not null,
  city text not null,
  province text not null,
  postal_code text not null,
  is_default boolean not null default false,
  is_default_shipping boolean not null default false,
  is_default_billing boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists carts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references user_profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'checked_out', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references carts(id) on delete cascade,
  product_id text not null,
  source text not null,
  source_id text,
  sku text not null,
  product_name text not null,
  slug text not null,
  selected_color text not null,
  total_qty integer not null check (total_qty > 0),
  price_from integer not null check (price_from >= 0),
  moq integer not null check (moq >= 0),
  fulfillment_type text not null,
  transaction_mode text not null,
  model_3d_id text not null,
  model_3d_url text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cart_item_size_matrix (
  id uuid primary key default gen_random_uuid(),
  cart_item_id uuid not null references cart_items(id) on delete cascade,
  size text not null,
  qty integer not null check (qty >= 0),
  created_at timestamptz not null default now(),
  unique (cart_item_id, size)
);

create table if not exists cart_item_customizations (
  id uuid primary key default gen_random_uuid(),
  cart_item_id uuid not null references cart_items(id) on delete cascade,
  customization_type text not null,
  placement text,
  logo_file_id text,
  width_cm numeric(8, 2),
  height_cm numeric(8, 2),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id text primary key default gen_random_uuid()::text,
  order_number text not null unique,
  cart_id text,
  company_id text not null,
  user_id text not null,
  status text not null,
  payment_status text not null,
  fulfillment_type text not null,
  transaction_mode text not null,
  subtotal integer not null check (subtotal >= 0),
  shipping_total integer not null default 0 check (shipping_total >= 0),
  tax_total integer not null default 0 check (tax_total >= 0),
  grand_total integer not null check (grand_total >= 0),
  selected_shipping_rate_json jsonb,
  order_json jsonb,
  woo_order_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists order_items (
  id text primary key default gen_random_uuid()::text,
  order_id text not null references orders(id) on delete cascade,
  product_id text not null,
  source text not null,
  source_id text,
  sku text not null,
  product_name text not null,
  slug text not null,
  selected_color text not null,
  total_qty integer not null check (total_qty > 0),
  price_from integer not null check (price_from >= 0),
  model_3d_id text not null,
  model_3d_url text not null,
  item_snapshot_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id text primary key default gen_random_uuid()::text,
  order_id text not null references orders(id) on delete cascade,
  company_id text not null,
  provider text not null,
  status text not null,
  amount integer not null check (amount >= 0),
  reference_id text not null unique,
  provider_payment_id text,
  provider_transaction_id text,
  payment_url text,
  payment_qr_url text,
  payment_qr_data_url text,
  payment_qr_string text,
  payment_method text,
  payment_channel text,
  unique_code integer not null default 0,
  expired_at timestamptz,
  paid_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,
  callback_received_at timestamptz,
  callback_status text,
  callback_reference text,
  callback_amount integer,
  callback_raw_safe_json jsonb,
  invoice_document_id text,
  raw_safe_metadata_json jsonb,
  payment_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payment_events (
  id text primary key,
  payment_id text not null references payments(id) on delete cascade,
  order_id text not null references orders(id) on delete cascade,
  company_id text not null,
  provider text not null check (provider in ('mock', 'ipaymu')),
  event_type text not null check (
    event_type in (
      'payment_created',
      'payment_link_created',
      'payment_callback_received',
      'payment_paid',
      'payment_failed',
      'payment_expired',
      'payment_cancelled',
      'payment_verification_failed',
      'invoice_regenerated_with_payment'
    )
  ),
  old_status text,
  new_status text,
  reference_id text not null,
  amount integer not null check (amount >= 0),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists shipments (
  id text primary key default gen_random_uuid()::text,
  shipment_number text not null default concat('SHP-', upper(left(gen_random_uuid()::text, 8))),
  order_id text not null references orders(id) on delete cascade,
  process_order_id text,
  company_id text not null,
  provider text not null check (provider in ('manual', 'jne', 'jnt', 'sicepat', 'anteraja', 'cargo', 'pickup')),
  service text not null,
  tracking_number text,
  tracking_url text,
  status text not null check (
    status in (
      'draft',
      'ready_to_ship',
      'booked',
      'picked_up',
      'in_transit',
      'delivered',
      'failed',
      'returned',
      'cancelled'
    )
  ),
  shipping_cost integer not null default 0,
  shipping_rate_json jsonb,
  recipient_name text,
  recipient_phone text,
  destination_address_json jsonb,
  shipped_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  created_by text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists shipment_events (
  id text primary key,
  shipment_id text not null references shipments(id) on delete cascade,
  order_id text not null references orders(id) on delete cascade,
  company_id text not null,
  actor_id text,
  actor_type text not null check (actor_type in ('internal', 'customer', 'system')),
  event_type text not null check (
    event_type in (
      'shipment_created',
      'shipment_ready_to_ship',
      'shipment_booked',
      'tracking_number_added',
      'shipment_picked_up',
      'shipment_in_transit',
      'shipment_delivered',
      'shipment_failed',
      'shipment_returned',
      'shipment_cancelled',
      'shipment_note_added'
    )
  ),
  old_status text,
  new_status text,
  note text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists tracking_records (
  id text primary key default gen_random_uuid()::text,
  order_id text not null references orders(id) on delete cascade,
  company_id text not null,
  status text not null,
  current_status text not null,
  next_step text,
  progress integer not null default 0 check (progress between 0 and 100),
  timeline_json jsonb not null default '[]'::jsonb,
  tracking_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id)
);

create table if not exists company_logos (
  id text primary key default gen_random_uuid()::text,
  company_id text not null,
  file_id text not null,
  label text not null,
  logo_type text not null default 'company_logo',
  is_default boolean not null default false,
  status text not null default 'active' check (status in ('active', 'deleted')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists uploaded_files (
  id text primary key default gen_random_uuid()::text,
  company_id text not null,
  user_id text not null,
  file_type text not null check (
    file_type in (
      'company_logo',
      'embroidery_logo',
      'artwork',
      'quotation_attachment',
      'invoice_document',
      'purchase_order_document',
      '3d_snapshot',
      'product_glb_admin_future'
    )
  ),
  original_filename text not null,
  safe_filename text not null,
  storage_provider text not null default 'mock' check (storage_provider in ('mock', 'supabase', 's3')),
  storage_bucket text not null,
  storage_key text not null unique,
  mime_type text not null,
  extension text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  status text not null default 'uploaded' check (
    status in ('pending', 'uploaded', 'validated', 'rejected', 'deleted', 'used')
  ),
  public_url text,
  signed_url_expires_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  checksum text,
  scan_status text not null default 'skipped' check (scan_status in ('pending', 'clean', 'flagged', 'skipped')),
  sanitized_status text not null default 'not_required' check (sanitized_status in ('pending', 'sanitized', 'not_required', 'required')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists documents (
  id text primary key default gen_random_uuid()::text,
  company_id text not null,
  user_id text,
  document_type text not null check (
    document_type in (
      'quotation_pdf',
      'invoice_pdf',
      'production_order_pdf_future',
      'packing_slip_pdf_future'
    )
  ),
  entity_type text not null check (entity_type in ('quotation', 'order', 'process_order')),
  entity_id text not null,
  document_number text not null,
  template_id text not null check (
    template_id in ('quotation_default', 'invoice_default', 'invoice_ofissio_custom')
  ),
  file_id text not null,
  storage_bucket text not null,
  storage_key text not null,
  filename text not null,
  mime_type text not null default 'application/pdf',
  size_bytes bigint not null check (size_bytes >= 0),
  status text not null default 'generated' check (
    status in ('draft', 'generated', 'failed', 'expired', 'deleted')
  ),
  generated_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists quotations (
  id text primary key,
  quotation_number text not null unique,
  company_id text not null,
  company_name text,
  user_id text not null,
  user_email text,
  pic_name text not null,
  pic_email text,
  pic_whatsapp text,
  status text not null check (
    status in (
      'draft',
      'submitted',
      'emailed',
      'under_review',
      'quoted',
      'revision_requested',
      'accepted',
      'rejected',
      'expired',
      'converted_to_order'
    )
  ),
  source text not null default 'web_cart' check (source in ('web_cart', 'custom_request')),
  subtotal_estimate integer not null default 0 check (subtotal_estimate >= 0),
  total_qty integer not null default 0 check (total_qty >= 0),
  embroidery_point_count integer not null default 0 check (embroidery_point_count >= 0),
  customer_notes text,
  shipping_destination text,
  email_status text not null default 'skipped' check (
    email_status in ('queued', 'sent', 'failed', 'skipped', 'mocked')
  ),
  email_log_ids_json jsonb not null default '[]'::jsonb,
  email_results_json jsonb not null default '[]'::jsonb,
  quotation_json jsonb,
  safe_metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists quotation_items (
  id text primary key default gen_random_uuid()::text,
  quotation_id text not null references quotations(id) on delete cascade,
  product_id text not null,
  source text not null,
  source_id text,
  sku text not null,
  product_name text not null,
  slug text not null,
  selected_color text not null,
  size_matrix_json jsonb not null default '{}'::jsonb,
  total_qty integer not null check (total_qty > 0),
  price_from integer not null check (price_from >= 0),
  fulfillment_type text not null,
  transaction_mode text not null,
  model_3d_id text not null,
  model_3d_url text not null,
  customization text,
  embroidery_placements_json jsonb not null default '[]'::jsonb,
  item_snapshot_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists email_logs (
  id text primary key,
  company_id text,
  user_id text,
  provider text not null check (provider in ('mock', 'resend', 'smtp')),
  status text not null check (status in ('queued', 'sent', 'failed', 'skipped', 'mocked')),
  type text not null check (
    type in (
      'quotation_request_sales',
      'quotation_confirmation_customer',
      'quotation_ready_customer',
      'payment_received_customer',
      'order_tracking_update_customer',
      'upload_notification_internal',
      'order_created_internal',
      'test_email'
    )
  ),
  recipient_emails_json jsonb not null default '[]'::jsonb,
  from_email text not null,
  reply_to_email text,
  subject text not null,
  provider_message_id text,
  error_message text,
  safe_metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

-- company_logos.file_id intentionally stores app-generated uploaded_files.id.
-- Add an FK only after final ID strategy is confirmed in staging.

-- cart_item_customizations.logo_file_id intentionally stores app-generated
-- uploaded_files.id. Add FK after cart persistence is fully migrated.

create table if not exists audit_logs (
  id text primary key default gen_random_uuid()::text,
  actor_id text,
  actor_type text not null check (actor_type in ('customer', 'internal', 'system')),
  company_id text,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata_json jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Important indexes.
create index if not exists idx_company_users_company_id on company_users(company_id);
create index if not exists idx_company_users_user_id on company_users(user_id);
create index if not exists idx_company_addresses_company_id on company_addresses(company_id);
create index if not exists idx_carts_company_user_status on carts(company_id, user_id, status);
create index if not exists idx_cart_items_cart_id on cart_items(cart_id);
create index if not exists idx_orders_company_created_at on orders(company_id, created_at desc);
create index if not exists idx_orders_user_id on orders(user_id);
create index if not exists idx_orders_order_number on orders(order_number);
create index if not exists idx_order_items_order_id on order_items(order_id);
create index if not exists idx_payments_company_id on payments(company_id);
create index if not exists idx_payments_order_id on payments(order_id);
create index if not exists idx_payments_reference_id on payments(reference_id);
create index if not exists idx_shipments_company_id on shipments(company_id);
create index if not exists idx_shipments_order_id on shipments(order_id);
create unique index if not exists idx_shipments_shipment_number_unique on shipments(shipment_number);
create unique index if not exists idx_shipments_active_order_unique
  on shipments(order_id)
  where deleted_at is null and status <> 'cancelled';
create index if not exists idx_shipments_process_order_id on shipments(process_order_id);
create index if not exists idx_shipments_company_status on shipments(company_id, status);
create index if not exists idx_shipments_tracking_number on shipments(tracking_number);
create index if not exists idx_shipments_created_at on shipments(created_at desc);
create index if not exists idx_shipment_events_shipment_id on shipment_events(shipment_id);
create index if not exists idx_shipment_events_order_id on shipment_events(order_id);
create index if not exists idx_shipment_events_company_id on shipment_events(company_id);
create index if not exists idx_shipment_events_event_type on shipment_events(event_type);
create index if not exists idx_shipment_events_created_at on shipment_events(created_at desc);
create index if not exists idx_tracking_records_company_id on tracking_records(company_id);
create index if not exists idx_tracking_records_order_id on tracking_records(order_id);
create index if not exists idx_uploaded_files_company_id on uploaded_files(company_id);
create index if not exists idx_uploaded_files_storage_provider on uploaded_files(storage_provider);
create index if not exists idx_uploaded_files_storage_bucket on uploaded_files(storage_bucket);
create index if not exists idx_uploaded_files_file_type on uploaded_files(file_type);
create index if not exists idx_uploaded_files_status on uploaded_files(status);
create index if not exists idx_uploaded_files_deleted_at on uploaded_files(deleted_at);
create index if not exists idx_uploaded_files_created_at on uploaded_files(created_at desc);
create index if not exists idx_uploaded_files_company_type_status_created_at
  on uploaded_files(company_id, file_type, status, created_at desc);
create index if not exists idx_uploaded_files_storage_bucket_key
  on uploaded_files(storage_bucket, storage_key);
create index if not exists idx_company_logos_company_created_at
  on company_logos(company_id, created_at desc);
create index if not exists idx_company_logos_file_id on company_logos(file_id);
create index if not exists idx_quotations_company_created_at
  on quotations(company_id, created_at desc);
create index if not exists idx_quotations_status on quotations(status);
create index if not exists idx_quotation_items_quotation_id on quotation_items(quotation_id);

-- Phase 17 quotation management + convert-to-order foundation.
alter table quotations
  add column if not exists internal_notes_json jsonb not null default '[]'::jsonb,
  add column if not exists sales_notes text,
  add column if not exists customer_message text,
  add column if not exists subtotal numeric(14,2),
  add column if not exists discount_total numeric(14,2) not null default 0,
  add column if not exists tax_total numeric(14,2) not null default 0,
  add column if not exists shipping_estimate numeric(14,2) not null default 0,
  add column if not exists grand_total numeric(14,2),
  add column if not exists currency text not null default 'IDR',
  add column if not exists valid_until timestamptz,
  add column if not exists sales_email text,
  add column if not exists customer_email text,
  add column if not exists accepted_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists converted_order_id text,
  add column if not exists woo_order_id text;

alter table quotation_items
  add column if not exists unit_price numeric(14,2),
  add column if not exists line_subtotal numeric(14,2),
  add column if not exists discount_amount numeric(14,2) not null default 0,
  add column if not exists final_unit_price numeric(14,2),
  add column if not exists final_line_total numeric(14,2),
  add column if not exists logo_file_id text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists quotation_events (
  id text primary key,
  quotation_id text not null references quotations(id) on delete cascade,
  -- Text keeps this aligned with quotations.company_id until production auth
  -- and company ID strategy are fully migrated to uuid everywhere.
  company_id text not null,
  actor_id text,
  actor_type text not null check (actor_type in ('internal', 'customer', 'system')),
  event_type text not null,
  old_status text,
  new_status text,
  note text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_quotation_events_quotation_id
  on quotation_events(quotation_id);
create index if not exists idx_quotation_events_company_id
  on quotation_events(company_id);
create index if not exists idx_quotation_events_event_type
  on quotation_events(event_type);
create index if not exists idx_quotation_events_created_at
  on quotation_events(created_at desc);

-- Phase 18 WooCommerce staging product/order sync foundation.
alter table orders
  add column if not exists woo_order_number text,
  add column if not exists woo_sync_status text not null default 'disabled'
    check (woo_sync_status in ('disabled', 'pending', 'synced', 'failed')),
  add column if not exists woo_sync_error text,
  add column if not exists woo_synced_at timestamptz,
  add column if not exists process_route text not null default 'fulfillment'
    check (process_route in ('fulfillment', 'customization', 'production')),
  add column if not exists process_status text not null default 'not_started'
    check (process_status in ('not_started', 'ready_to_process', 'in_progress', 'waiting_replenishment', 'waiting_customer_approval', 'on_hold', 'completed', 'cancelled')),
  add column if not exists replenishment_status text not null default 'not_required'
    check (replenishment_status in ('not_required', 'needed', 'in_progress', 'completed')),
  add column if not exists has_customization boolean not null default false,
  add column if not exists customization_type text not null default 'none'
    check (customization_type in ('embroidery', 'screen_printing', 'dtf', 'name_tag', 'custom_design', 'none'));

alter table quotations
  add column if not exists woo_order_number text,
  add column if not exists woo_sync_status text not null default 'disabled'
    check (woo_sync_status in ('disabled', 'pending', 'synced', 'failed')),
  add column if not exists woo_sync_error text,
  add column if not exists woo_synced_at timestamptz;

create table if not exists woo_sync_logs (
  id text primary key,
  company_id text not null,
  ofissio_order_id text,
  quotation_id text,
  woo_order_id text,
  direction text not null check (
    direction in ('ofissio_to_woocommerce', 'woocommerce_to_ofissio')
  ),
  action text not null check (
    action in ('create_order', 'update_payment_status', 'product_pull', 'manual_retry')
  ),
  status text not null check (status in ('pending', 'synced', 'failed', 'skipped')),
  safe_payload_json jsonb not null default '{}'::jsonb,
  error_code text,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_orders_woo_order_id
  on orders(woo_order_id);
create index if not exists idx_orders_woo_sync_status
  on orders(woo_sync_status);
create index if not exists idx_orders_process_route_status
  on orders(process_route, process_status);
create index if not exists idx_orders_replenishment_status
  on orders(replenishment_status);
create index if not exists idx_quotations_woo_order_id
  on quotations(woo_order_id);
create index if not exists idx_quotations_woo_sync_status
  on quotations(woo_sync_status);
create index if not exists idx_woo_sync_logs_company_created_at
  on woo_sync_logs(company_id, created_at desc);
create index if not exists idx_woo_sync_logs_order_id
  on woo_sync_logs(ofissio_order_id);
create index if not exists idx_woo_sync_logs_woo_order_id
  on woo_sync_logs(woo_order_id);
create index if not exists idx_email_logs_company_created_at
  on email_logs(company_id, created_at desc);
create index if not exists idx_email_logs_type_status_created_at
  on email_logs(type, status, created_at desc);
create index if not exists idx_audit_logs_company_created_at on audit_logs(company_id, created_at desc);
create index if not exists idx_audit_logs_entity on audit_logs(entity_type, entity_id);

-- Phase 19 Fulfillment, Customization & Production Order foundation.
create table if not exists process_orders (
  id text primary key,
  process_order_number text not null unique,
  ofissio_order_id text not null references orders(id) on delete cascade,
  woo_order_id text,
  quotation_id text references quotations(id) on delete set null,
  company_id text not null,
  process_route text not null check (
    process_route in ('fulfillment', 'customization', 'production')
  ),
  process_status text not null check (
    process_status in (
      'not_started',
      'ready_to_process',
      'in_progress',
      'waiting_replenishment',
      'waiting_customer_approval',
      'on_hold',
      'completed',
      'cancelled'
    )
  ),
  replenishment_status text not null default 'not_required' check (
    replenishment_status in ('not_required', 'needed', 'in_progress', 'completed')
  ),
  current_stage text not null,
  progress integer not null default 0 check (progress between 0 and 100),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  deadline timestamptz,
  assigned_team text,
  created_by text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (ofissio_order_id)
);

create table if not exists process_order_items (
  id text primary key,
  process_order_id text not null references process_orders(id) on delete cascade,
  order_item_id text,
  product_id text not null,
  source text not null,
  source_id text,
  sku text not null,
  product_name text not null,
  selected_color text not null,
  total_qty integer not null check (total_qty > 0),
  size_matrix_json jsonb not null default '{}'::jsonb,
  customization_json jsonb not null default '{}'::jsonb,
  model_3d_id text,
  model_3d_url text,
  item_snapshot_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists process_order_tasks (
  id text primary key,
  process_order_id text not null references process_orders(id) on delete cascade,
  task_key text not null,
  task_name text not null,
  stage text not null,
  status text not null check (status in ('pending', 'in_progress', 'completed', 'blocked')),
  sort_order integer not null default 0,
  assigned_to text,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists process_order_events (
  id text primary key,
  process_order_id text not null references process_orders(id) on delete cascade,
  company_id text not null,
  actor_id text,
  actor_type text not null check (actor_type in ('internal', 'customer', 'system')),
  event_type text not null check (
    event_type in (
      'created',
      'status_updated',
      'stage_updated',
      'task_completed',
      'replenishment_updated',
      'note_added',
      'event_added'
    )
  ),
  old_status text,
  new_status text,
  old_stage text,
  new_stage text,
  note text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_process_orders_company_id
  on process_orders(company_id);
create index if not exists idx_process_orders_ofissio_order_id
  on process_orders(ofissio_order_id);
create index if not exists idx_process_orders_woo_order_id
  on process_orders(woo_order_id);
create index if not exists idx_process_orders_quotation_id
  on process_orders(quotation_id);
create index if not exists idx_process_orders_process_route
  on process_orders(process_route);
create index if not exists idx_process_orders_process_status
  on process_orders(process_status);
create index if not exists idx_process_orders_current_stage
  on process_orders(current_stage);
create index if not exists idx_process_orders_created_at
  on process_orders(created_at desc);
create index if not exists idx_process_order_items_process_order_id
  on process_order_items(process_order_id);
create index if not exists idx_process_order_tasks_process_order_id_sort
  on process_order_tasks(process_order_id, sort_order);
create index if not exists idx_process_order_tasks_status
  on process_order_tasks(status);
create index if not exists idx_process_order_events_process_order_id
  on process_order_events(process_order_id);
create index if not exists idx_process_order_events_company_id
  on process_order_events(company_id);
create index if not exists idx_process_order_events_created_at
  on process_order_events(created_at desc);

-- RLS policy plan (enable after auth JWT/company claim strategy is final):
-- alter table companies enable row level security;
-- alter table company_users enable row level security;
-- alter table company_addresses enable row level security;
-- alter table carts enable row level security;
-- alter table orders enable row level security;
-- alter table payments enable row level security;
-- alter table shipments enable row level security;
-- alter table tracking_records enable row level security;
-- alter table uploaded_files enable row level security;
-- alter table company_logos enable row level security;
-- alter table quotations enable row level security;
-- alter table quotation_items enable row level security;
-- alter table quotation_events enable row level security;
-- alter table email_logs enable row level security;
-- Customer policies must filter rows by company_id derived from server/session,
-- never from untrusted request body.
--
-- Draft policies after JWT company claim is final:
-- create policy uploaded_files_company_select
--   on uploaded_files for select
--   using (company_id::text = auth.jwt() ->> 'company_id');
-- create policy uploaded_files_company_insert
--   on uploaded_files for insert
--   with check (company_id::text = auth.jwt() ->> 'company_id');
-- create policy uploaded_files_company_update
--   on uploaded_files for update
--   using (company_id::text = auth.jwt() ->> 'company_id')
--   with check (company_id::text = auth.jwt() ->> 'company_id');
-- create policy company_logos_company_select
--   on company_logos for select
--   using (company_id::text = auth.jwt() ->> 'company_id');
-- create policy company_logos_company_insert
--   on company_logos for insert
--   with check (company_id::text = auth.jwt() ->> 'company_id');
-- create policy company_logos_company_update
--   on company_logos for update
--   using (company_id::text = auth.jwt() ->> 'company_id')
--   with check (company_id::text = auth.jwt() ->> 'company_id');
-- create policy quotations_company_select
--   on quotations for select
--   using (company_id::text = auth.jwt() ->> 'company_id');
-- create policy quotations_company_insert
--   on quotations for insert
--   with check (company_id::text = auth.jwt() ->> 'company_id');
-- create policy quotation_items_company_select
--   on quotation_items for select
--   using (
--     exists (
--       select 1 from quotations q
--       where q.id = quotation_items.quotation_id
--         and q.company_id::text = auth.jwt() ->> 'company_id'
--     )
--   );
-- create policy email_logs_company_select
--   on email_logs for select
--   using (company_id::text = auth.jwt() ->> 'company_id');

-- Task A2.5 catalog taxonomy foundation. WooCommerce remains the source for
-- product categories/attributes; these tables persist Ofissio-only metadata.
create table if not exists catalog_category_metadata (
  id text primary key,
  woo_category_id bigint not null unique,
  category_slug text not null,
  active boolean not null default true,
  synonyms text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists industries (
  id text primary key,
  name text not null,
  slug text not null unique,
  description text not null default '',
  active boolean not null default true,
  synonyms text[] not null default '{}',
  sort_order integer not null default 100 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Global embroidery pricing master (Task A4 revision).
create table if not exists embroidery_pricing_zones (
  id text primary key,
  zone_id text not null unique check (zone_id in ('left_chest','right_chest','left_sleeve','right_sleeve','upper_back','center_back')),
  label text not null,
  enabled boolean not null default true,
  max_width_cm numeric(8,2) not null check (max_width_cm > 0),
  max_height_cm numeric(8,2) not null check (max_height_cm > 0),
  unit_price integer not null check (unit_price > 0),
  setup_fee integer not null default 0 check (setup_fee >= 0),
  show_setup_fee boolean not null default false,
  pricing_mode text not null default 'flat_per_piece' check (pricing_mode = 'flat_per_piece'),
  notes text not null default '',
  sort_order integer not null default 100 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_embroidery_pricing_zones_enabled_sort
  on embroidery_pricing_zones(enabled, sort_order, zone_id);
insert into embroidery_pricing_zones (id, zone_id, label, enabled, max_width_cm, max_height_cm, unit_price, setup_fee, show_setup_fee, pricing_mode, notes, sort_order) values
  ('embroidery-left-chest','left_chest','Dada Kiri',true,8,8,5000,0,false,'flat_per_piece','Logo kecil dada kiri',10),
  ('embroidery-right-chest','right_chest','Dada Kanan',true,8,8,5000,0,false,'flat_per_piece','Logo atau nama',20),
  ('embroidery-left-sleeve','left_sleeve','Lengan Kiri',true,7,7,6000,0,false,'flat_per_piece','Bordir lengan',30),
  ('embroidery-right-sleeve','right_sleeve','Lengan Kanan',true,7,7,6000,0,false,'flat_per_piece','Bordir lengan',40),
  ('embroidery-upper-back','upper_back','Punggung Atas',true,20,8,10000,0,false,'flat_per_piece','Logo sedang punggung atas',50),
  ('embroidery-center-back','center_back','Punggung Tengah',true,25,20,15000,0,false,'flat_per_piece','Logo besar punggung tengah',60)
on conflict (zone_id) do nothing;
alter table embroidery_pricing_zones enable row level security;

-- Task A6.1 internal admin notification inbox.
create table if not exists admin_notifications (
  id text primary key,
  type text not null check (type in ('order_created','quotation_requested','quotation_accepted','payment_paid','shipment_created','system_warning')),
  title text not null,
  message text not null,
  entity_type text not null,
  entity_id text not null,
  entity_number text null,
  severity text not null default 'info' check (severity in ('info','success','warning','error')),
  status text not null default 'unread' check (status in ('unread','read','acknowledged','resolved')),
  recipient_role text null,
  recipient_user_id text null,
  metadata jsonb not null default '{}'::jsonb,
  email_status text not null default 'not_required' check (email_status in ('not_required','pending','sent','mocked','failed')),
  email_id text null,
  email_error text null,
  created_at timestamptz not null default now(),
  read_at timestamptz null,
  acknowledged_at timestamptz null,
  resolved_at timestamptz null,
  updated_at timestamptz not null default now()
);
create unique index if not exists idx_admin_notifications_entity_unique
  on admin_notifications(type, entity_type, entity_id);
create index if not exists idx_admin_notifications_type on admin_notifications(type);
create index if not exists idx_admin_notifications_status on admin_notifications(status);
create index if not exists idx_admin_notifications_severity on admin_notifications(severity);
create index if not exists idx_admin_notifications_entity on admin_notifications(entity_type, entity_id);
create index if not exists idx_admin_notifications_recipient_role on admin_notifications(recipient_role);
create index if not exists idx_admin_notifications_recipient_user on admin_notifications(recipient_user_id);
create index if not exists idx_admin_notifications_created_desc on admin_notifications(created_at desc);
alter table admin_notifications enable row level security;

-- Global quotation tax defaults. Quotation/order snapshots remain immutable.
create table if not exists tax_settings (
  id text primary key,
  enabled boolean not null default true,
  rate numeric(5,2) not null default 11 check (rate >= 0 and rate <= 100),
  label text not null default 'PPN',
  calculation_basis text not null default 'after_discount'
    check (calculation_basis = 'after_discount'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into tax_settings (id, enabled, rate, label, calculation_basis)
values ('default', true, 11, 'PPN', 'after_discount')
on conflict (id) do nothing;
alter table tax_settings enable row level security;

-- Task D Supabase Auth production tables. Apply migration
-- 015_supabase_auth_production.sql for policies and compatibility setup.
create unique index if not exists idx_user_profiles_auth_user_id_unique
  on user_profiles(auth_user_id)
  where auth_user_id is not null;

create table if not exists company_memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_profile_id uuid not null references user_profiles(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('customer_user', 'customer_admin')),
  status text not null default 'active' check (status in ('active', 'inactive', 'invited')),
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz,
  last_accessed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, auth_user_id),
  unique(company_id, user_profile_id)
);

create table if not exists internal_user_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null check (
    role in (
      'super_admin', 'sales_admin', 'finance_admin', 'sales',
      'finance_internal', 'product_admin', 'production_admin', 'ppic',
      'qc', 'logistics', 'support'
    )
  ),
  status text not null default 'active' check (status in ('active', 'inactive', 'invited')),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table company_memberships enable row level security;
alter table internal_user_profiles enable row level security;

-- Task E Biteship carrier shipping. See migration 019_biteship_shipping.sql.
create table if not exists shipping_quotes (
  id text primary key,
  order_id text not null references orders(id) on delete cascade,
  company_id text not null,
  provider text not null check (provider in ('mock', 'biteship')),
  provider_quote_id text not null,
  courier_company text not null,
  courier_type text not null,
  courier_service text not null,
  shipping_price numeric(14,2) not null check (shipping_price >= 0),
  currency text not null default 'IDR',
  duration text,
  shipping_price_snapshot jsonb not null default '{}'::jsonb,
  origin_snapshot jsonb not null default '{}'::jsonb,
  destination_snapshot jsonb not null default '{}'::jsonb,
  package_snapshot jsonb not null default '[]'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists shipping_shipments (
  id text primary key,
  order_id text not null references orders(id) on delete cascade,
  company_id text not null,
  quote_id text not null references shipping_quotes(id) on delete restrict,
  provider text not null check (provider in ('mock', 'biteship')),
  provider_shipment_id text,
  biteship_order_id text,
  biteship_waybill_id text,
  courier_company text not null,
  courier_type text not null,
  courier_service text not null,
  shipment_status text not null,
  shipping_price numeric(14,2) not null check (shipping_price >= 0),
  shipping_price_snapshot jsonb not null default '{}'::jsonb,
  origin_snapshot jsonb not null default '{}'::jsonb,
  destination_snapshot jsonb not null default '{}'::jsonb,
  package_snapshot jsonb not null default '[]'::jsonb,
  tracking_url text,
  provider_status text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_id)
);
create table if not exists shipping_events (
  id text primary key,
  shipment_id text not null references shipping_shipments(id) on delete cascade,
  order_id text not null references orders(id) on delete cascade,
  company_id text not null,
  event_type text not null,
  old_status text,
  new_status text,
  provider_status text,
  webhook_event_id text,
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create unique index if not exists idx_shipping_shipments_provider_id on shipping_shipments(provider, provider_shipment_id) where provider_shipment_id is not null;
create unique index if not exists idx_shipping_events_webhook_unique on shipping_events(webhook_event_id) where webhook_event_id is not null;
alter table shipping_quotes enable row level security;
alter table shipping_shipments enable row level security;
alter table shipping_events enable row level security;

-- Task F final RLS state. Migration 020 remains the deployment artifact.
create or replace function public.ofissio_has_company_access(target_company_id text)
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.company_memberships membership
    where membership.auth_user_id = auth.uid()
      and membership.status = 'active'
      and membership.company_id::text = target_company_id
  );
$$;

create or replace function public.ofissio_owns_cart(target_cart_id uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.carts cart
    join public.company_memberships membership
      on membership.company_id = cart.company_id
     and membership.user_profile_id = cart.user_id
    where cart.id = target_cart_id
      and membership.auth_user_id = auth.uid()
      and membership.status = 'active'
  );
$$;

create or replace function public.ofissio_owns_cart_item(target_cart_item_id uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.cart_items item
    where item.id = target_cart_item_id
      and public.ofissio_owns_cart(item.cart_id)
  );
$$;

create or replace function public.ofissio_has_order_access(target_order_id text)
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.orders customer_order
    where customer_order.id = target_order_id
      and public.ofissio_has_company_access(customer_order.company_id::text)
  );
$$;

create or replace function public.ofissio_has_quotation_access(target_quotation_id text)
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.quotations quotation
    where quotation.id = target_quotation_id
      and public.ofissio_has_company_access(quotation.company_id::text)
  );
$$;

revoke all on function public.ofissio_has_company_access(text) from public;
revoke all on function public.ofissio_owns_cart(uuid) from public;
revoke all on function public.ofissio_owns_cart_item(uuid) from public;
revoke all on function public.ofissio_has_order_access(text) from public;
revoke all on function public.ofissio_has_quotation_access(text) from public;
grant execute on function public.ofissio_has_company_access(text) to authenticated, service_role;
grant execute on function public.ofissio_owns_cart(uuid) to authenticated, service_role;
grant execute on function public.ofissio_owns_cart_item(uuid) to authenticated, service_role;
grant execute on function public.ofissio_has_order_access(text) to authenticated, service_role;
grant execute on function public.ofissio_has_quotation_access(text) to authenticated, service_role;

do $$
declare
  protected_table text;
begin
  foreach protected_table in array array[
    'companies', 'user_profiles', 'company_users', 'company_addresses',
    'company_memberships', 'internal_user_profiles', 'carts', 'cart_items',
    'cart_item_size_matrix', 'cart_item_customizations', 'quotations',
    'quotation_items', 'quotation_events', 'orders', 'order_items',
    'payments', 'payment_events', 'documents', 'uploaded_files',
    'company_logos', 'shipments', 'shipment_events', 'shipping_quotes',
    'shipping_shipments', 'shipping_events', 'tracking_records',
    'process_orders', 'process_order_items', 'process_order_tasks',
    'process_order_events', 'email_logs', 'audit_logs', 'woo_sync_logs',
    'admin_notifications'
  ]
  loop
    execute format('alter table public.%I enable row level security', protected_table);
    execute format('alter table public.%I force row level security', protected_table);
  end loop;
end $$;

drop policy if exists uploaded_files_company_insert on public.uploaded_files;
drop policy if exists uploaded_files_company_select on public.uploaded_files;
drop policy if exists carts_owner_write on public.carts;
drop policy if exists quotation_events_company_insert on public.quotation_events;
drop policy if exists quotation_events_company_select on public.quotation_events;
drop policy if exists payment_events_company_insert on public.payment_events;
drop policy if exists payment_events_company_select on public.payment_events;
drop policy if exists documents_company_select on public.documents;
drop policy if exists shipments_company_select on public.shipments;
drop policy if exists shipment_events_company_select on public.shipment_events;
drop policy if exists process_orders_company_select on public.process_orders;
drop policy if exists process_order_items_company_select on public.process_order_items;
drop policy if exists process_order_tasks_company_select on public.process_order_tasks;
drop policy if exists process_order_events_company_select on public.process_order_events;
drop policy if exists woo_sync_logs_company_select on public.woo_sync_logs;
drop policy if exists woo_sync_logs_company_insert on public.woo_sync_logs;

drop policy if exists company_memberships_self_select on public.company_memberships;
create policy company_memberships_self_select on public.company_memberships
  for select to authenticated using (auth_user_id = auth.uid() and status = 'active');
drop policy if exists user_profiles_self_select on public.user_profiles;
create policy user_profiles_self_select on public.user_profiles
  for select to authenticated using (auth_user_id = auth.uid() and status = 'active');
drop policy if exists companies_member_select on public.companies;
create policy companies_member_select on public.companies
  for select to authenticated using (public.ofissio_has_company_access(id::text));
drop policy if exists company_users_member_select on public.company_users;
create policy company_users_member_select on public.company_users
  for select to authenticated using (public.ofissio_has_company_access(company_id::text));
drop policy if exists company_addresses_company_select on public.company_addresses;
create policy company_addresses_company_select on public.company_addresses
  for select to authenticated using (public.ofissio_has_company_access(company_id::text));
drop policy if exists carts_owner_select on public.carts;
create policy carts_owner_select on public.carts
  for select to authenticated using (public.ofissio_owns_cart(id));
drop policy if exists cart_items_owner_select on public.cart_items;
create policy cart_items_owner_select on public.cart_items
  for select to authenticated using (public.ofissio_owns_cart(cart_id));
drop policy if exists cart_item_size_matrix_owner_select on public.cart_item_size_matrix;
create policy cart_item_size_matrix_owner_select on public.cart_item_size_matrix
  for select to authenticated using (public.ofissio_owns_cart_item(cart_item_id));
drop policy if exists cart_item_customizations_owner_select on public.cart_item_customizations;
create policy cart_item_customizations_owner_select on public.cart_item_customizations
  for select to authenticated using (public.ofissio_owns_cart_item(cart_item_id));
drop policy if exists quotations_company_select on public.quotations;
create policy quotations_company_select on public.quotations
  for select to authenticated using (public.ofissio_has_company_access(company_id::text));
drop policy if exists quotation_items_company_select on public.quotation_items;
create policy quotation_items_company_select on public.quotation_items
  for select to authenticated using (public.ofissio_has_quotation_access(quotation_id));
drop policy if exists orders_company_select on public.orders;
create policy orders_company_select on public.orders
  for select to authenticated using (public.ofissio_has_company_access(company_id::text));
drop policy if exists order_items_company_select on public.order_items;
create policy order_items_company_select on public.order_items
  for select to authenticated using (public.ofissio_has_order_access(order_id));
drop policy if exists payments_company_select on public.payments;
create policy payments_company_select on public.payments
  for select to authenticated using (public.ofissio_has_company_access(company_id::text));
drop policy if exists tracking_records_company_select on public.tracking_records;
create policy tracking_records_company_select on public.tracking_records
  for select to authenticated using (public.ofissio_has_company_access(company_id::text));
drop policy if exists company_logos_company_select on public.company_logos;
create policy company_logos_company_select on public.company_logos
  for select to authenticated using (public.ofissio_has_company_access(company_id::text));
drop policy if exists shipping_quotes_company_select on public.shipping_quotes;
create policy shipping_quotes_company_select on public.shipping_quotes
  for select to authenticated using (public.ofissio_has_company_access(company_id::text));
drop policy if exists shipping_shipments_company_select on public.shipping_shipments;
create policy shipping_shipments_company_select on public.shipping_shipments
  for select to authenticated using (public.ofissio_has_company_access(company_id::text));

update storage.buckets set public = false
where id in ('ofissio-logos', 'ofissio-artwork', 'ofissio-documents', 'ofissio-3d-models');

create or replace function public.ofissio_rls_security_inventory()
returns table (
  table_name text,
  rls_enabled boolean,
  rls_forced boolean,
  policy_count bigint,
  write_policy_count bigint,
  anonymous_policy_count bigint
)
language sql stable security definer
set search_path = public, pg_temp
as $$
  with wanted(table_name) as (
    select unnest(array[
      'companies', 'user_profiles', 'company_users', 'company_addresses',
      'company_memberships', 'internal_user_profiles', 'carts', 'cart_items',
      'cart_item_size_matrix', 'cart_item_customizations', 'quotations',
      'quotation_items', 'quotation_events', 'orders', 'order_items',
      'payments', 'payment_events', 'documents', 'uploaded_files',
      'company_logos', 'shipments', 'shipment_events', 'shipping_quotes',
      'shipping_shipments', 'shipping_events', 'tracking_records',
      'process_orders', 'process_order_items', 'process_order_tasks',
      'process_order_events', 'email_logs', 'audit_logs', 'woo_sync_logs',
      'admin_notifications'
    ]::text[])
  )
  select wanted.table_name,
    coalesce(pg_class.relrowsecurity, false),
    coalesce(pg_class.relforcerowsecurity, false),
    (select count(*) from pg_policies policy where policy.schemaname = 'public' and policy.tablename = wanted.table_name),
    (select count(*) from pg_policies policy where policy.schemaname = 'public' and policy.tablename = wanted.table_name and policy.cmd <> 'SELECT'),
    (select count(*) from pg_policies policy where policy.schemaname = 'public' and policy.tablename = wanted.table_name and (policy.roles @> array['anon']::name[] or policy.roles @> array['public']::name[]))
  from wanted
  left join pg_class on pg_class.relname = wanted.table_name
    and pg_class.relnamespace = 'public'::regnamespace
  order by wanted.table_name;
$$;
revoke all on function public.ofissio_rls_security_inventory() from public;
grant execute on function public.ofissio_rls_security_inventory() to service_role;

-- Task G1: Ginee Omnichannel read-only connector metadata.
create table if not exists public.ginee_product_mappings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid null references public.companies(id) on delete cascade,
  ofissio_product_id text null,
  woocommerce_product_id text null,
  woocommerce_variation_id text null,
  parent_sku text not null check (char_length(parent_sku) between 2 and 128),
  stock_sku text not null check (char_length(stock_sku) between 2 and 128),
  size_label text null,
  color_label text null,
  ginee_product_id text null,
  ginee_variation_id text null,
  ginee_master_product_id text null,
  ginee_sku text not null check (char_length(ginee_sku) between 2 and 128),
  ginee_warehouse_id text null,
  sync_stock_enabled boolean not null default false,
  sync_order_enabled boolean not null default false,
  last_synced_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ginee_product_mappings_readonly_flags
    check (sync_stock_enabled = false and sync_order_enabled = false)
);
create unique index if not exists ginee_product_mappings_identity_uidx
  on public.ginee_product_mappings (stock_sku, ginee_sku, coalesce(ginee_warehouse_id, ''));
create index if not exists ginee_product_mappings_stock_sku_idx on public.ginee_product_mappings (stock_sku);
create index if not exists ginee_product_mappings_parent_sku_idx on public.ginee_product_mappings (parent_sku);
create index if not exists ginee_product_mappings_ginee_sku_idx on public.ginee_product_mappings (ginee_sku);
create index if not exists ginee_product_mappings_woo_product_idx on public.ginee_product_mappings (woocommerce_product_id);
create index if not exists ginee_product_mappings_ginee_product_idx on public.ginee_product_mappings (ginee_product_id);

create table if not exists public.ginee_order_snapshots (
  id uuid primary key default gen_random_uuid(),
  ginee_order_id text not null unique,
  channel_order_id text null,
  shop_id text null,
  status text null,
  raw_status text null,
  order_created_at timestamptz null,
  order_updated_at timestamptz null,
  mapped_status text null,
  unmapped_skus jsonb not null default '[]'::jsonb,
  sanitized_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ginee_order_snapshots_unmapped_array check (jsonb_typeof(unmapped_skus) = 'array'),
  constraint ginee_order_snapshots_sanitized_object check (jsonb_typeof(sanitized_snapshot) = 'object')
);
create index if not exists ginee_order_snapshots_channel_order_idx on public.ginee_order_snapshots (channel_order_id);
create unique index if not exists ginee_order_snapshots_channel_order_uidx
  on public.ginee_order_snapshots (channel_order_id) where channel_order_id is not null;
create index if not exists ginee_order_snapshots_shop_idx on public.ginee_order_snapshots (shop_id);
create index if not exists ginee_order_snapshots_updated_idx on public.ginee_order_snapshots (order_updated_at desc);

create table if not exists public.ginee_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text null,
  event_type text not null,
  entity_type text null,
  entity_id text null,
  status text not null,
  idempotency_key text not null unique,
  sanitized_payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint ginee_webhook_events_sanitized_object check (jsonb_typeof(sanitized_payload) = 'object')
);
create index if not exists ginee_webhook_events_entity_idx on public.ginee_webhook_events (entity_type, entity_id);
create index if not exists ginee_webhook_events_status_idx on public.ginee_webhook_events (status, created_at desc);

alter table public.ginee_product_mappings enable row level security;
alter table public.ginee_product_mappings force row level security;
alter table public.ginee_order_snapshots enable row level security;
alter table public.ginee_order_snapshots force row level security;
alter table public.ginee_webhook_events enable row level security;
alter table public.ginee_webhook_events force row level security;
revoke all on table public.ginee_product_mappings from anon, authenticated;
revoke all on table public.ginee_order_snapshots from anon, authenticated;
revoke all on table public.ginee_webhook_events from anon, authenticated;
grant all on table public.ginee_product_mappings to service_role;
grant all on table public.ginee_order_snapshots to service_role;
grant all on table public.ginee_webhook_events to service_role;
