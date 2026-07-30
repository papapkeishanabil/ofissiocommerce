-- Ofissio migration 009: Manual shipment production flow foundation.
--
-- Manual procedure only:
-- 1. Review this file.
-- 2. Run in Supabase SQL Editor for staging/dev when Phase 24 shipment
--    persistence is ready to be activated.
-- 3. Do not run automatically from Codex.
-- 4. Do not place provider API keys in this file.
--
-- Compatibility note:
-- company_id remains text in operational tables because current app order IDs
-- and seeded company IDs are app-generated text values. Service-role server
-- routes enforce internal/customer authorization.

alter table shipments
  add column if not exists shipment_number text,
  add column if not exists process_order_id text references process_orders(id) on delete set null,
  add column if not exists tracking_url text,
  add column if not exists shipping_cost integer not null default 0,
  add column if not exists recipient_name text,
  add column if not exists recipient_phone text,
  add column if not exists destination_address_json jsonb,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists created_by text,
  add column if not exists notes text,
  add column if not exists deleted_at timestamptz;

update shipments
set shipment_number = concat('SHP-LEGACY-', upper(left(id, 8)))
where shipment_number is null;

alter table shipments
  alter column shipment_number set not null;

alter table shipments
  drop constraint if exists shipments_provider_check,
  add constraint shipments_provider_check
  check (provider in ('manual', 'jne', 'jnt', 'sicepat', 'anteraja', 'cargo', 'pickup'));

alter table shipments
  drop constraint if exists shipments_status_check,
  add constraint shipments_status_check
  check (
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
  );

create unique index if not exists idx_shipments_shipment_number_unique
  on shipments(shipment_number);

create unique index if not exists idx_shipments_active_order_unique
  on shipments(order_id)
  where deleted_at is null and status <> 'cancelled';

create index if not exists idx_shipments_process_order_id
  on shipments(process_order_id);
create index if not exists idx_shipments_company_status
  on shipments(company_id, status);
create index if not exists idx_shipments_tracking_number
  on shipments(tracking_number);
create index if not exists idx_shipments_created_at
  on shipments(created_at desc);

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

create index if not exists idx_shipment_events_shipment_id
  on shipment_events(shipment_id);
create index if not exists idx_shipment_events_order_id
  on shipment_events(order_id);
create index if not exists idx_shipment_events_company_id
  on shipment_events(company_id);
create index if not exists idx_shipment_events_event_type
  on shipment_events(event_type);
create index if not exists idx_shipment_events_created_at
  on shipment_events(created_at desc);

alter table shipments enable row level security;
alter table shipment_events enable row level security;

drop policy if exists shipments_company_select on shipments;
create policy shipments_company_select
  on shipments for select
  using (company_id::text = auth.jwt()->>'company_id');

drop policy if exists shipment_events_company_select on shipment_events;
create policy shipment_events_company_select
  on shipment_events for select
  using (company_id::text = auth.jwt()->>'company_id');
