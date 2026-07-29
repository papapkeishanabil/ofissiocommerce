-- Ofissio migration 004: WooCommerce staging product/order sync foundation.
--
-- Manual procedure only:
-- 1. Review this file.
-- 2. Run in Supabase SQL Editor for staging/dev when WooCommerce sync is ready.
-- 3. Do not run automatically from Codex.
--
-- Compatibility note:
-- The application stores the canonical sync state in orders.order_json and
-- quotations.quotation_json first. These physical columns and logs are for
-- reporting, admin visibility, and future production operations.

alter table orders
  add column if not exists woo_order_id text,
  add column if not exists woo_order_number text,
  add column if not exists woo_sync_status text not null default 'disabled'
    check (woo_sync_status in ('disabled', 'pending', 'synced', 'failed')),
  add column if not exists woo_sync_error text,
  add column if not exists woo_synced_at timestamptz,
  add column if not exists process_route text not null default 'fulfillment'
    check (process_route in ('fulfillment', 'customization', 'production')),
  add column if not exists process_status text not null default 'not_started'
    check (process_status in ('not_started', 'ready_to_process', 'in_progress', 'waiting_replenishment', 'completed')),
  add column if not exists replenishment_status text not null default 'not_required'
    check (replenishment_status in ('not_required', 'needed', 'in_progress', 'completed')),
  add column if not exists has_customization boolean not null default false,
  add column if not exists customization_type text not null default 'none'
    check (customization_type in ('embroidery', 'screen_printing', 'dtf', 'name_tag', 'custom_design', 'none'));

alter table quotations
  add column if not exists woo_order_id text,
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

alter table woo_sync_logs enable row level security;

-- Draft RLS. Service role bypasses RLS; Ofissio internal APIs enforce admin
-- access server-side. Customer-side Supabase access is not used for this table.
drop policy if exists woo_sync_logs_company_select on woo_sync_logs;
create policy woo_sync_logs_company_select
  on woo_sync_logs for select
  using (company_id::text = auth.jwt()->>'company_id');

drop policy if exists woo_sync_logs_company_insert on woo_sync_logs;
create policy woo_sync_logs_company_insert
  on woo_sync_logs for insert
  with check (company_id::text = auth.jwt()->>'company_id');
