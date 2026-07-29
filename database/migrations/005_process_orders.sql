-- Ofissio migration 005: Fulfillment, Customization & Production Order foundation.
--
-- Manual procedure only:
-- 1. Review this file.
-- 2. Run in Supabase SQL Editor for staging/dev when Phase 19 persistence is ready.
-- 3. Do not run automatically from Codex.
--
-- Compatibility note:
-- company_id remains text in operational tables because current app order IDs
-- and seeded company IDs are app-generated text values. Do not add a FK to
-- companies(id) until the production auth/company ID strategy is finalized.

alter table orders
  drop constraint if exists orders_process_status_check;

alter table orders
  add constraint orders_process_status_check
  check (
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
  );

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

alter table process_orders enable row level security;
alter table process_order_items enable row level security;
alter table process_order_tasks enable row level security;
alter table process_order_events enable row level security;

-- Draft customer/company-scoped read policies for future customer tracking.
-- Internal admin all-company read/write remains server-side through the
-- Supabase service role and Ofissio API role guards.
drop policy if exists process_orders_company_select on process_orders;
create policy process_orders_company_select
  on process_orders for select
  using (company_id::text = auth.jwt()->>'company_id');

drop policy if exists process_order_items_company_select on process_order_items;
create policy process_order_items_company_select
  on process_order_items for select
  using (
    exists (
      select 1 from process_orders po
      where po.id = process_order_items.process_order_id
        and po.company_id::text = auth.jwt()->>'company_id'
    )
  );

drop policy if exists process_order_tasks_company_select on process_order_tasks;
create policy process_order_tasks_company_select
  on process_order_tasks for select
  using (
    exists (
      select 1 from process_orders po
      where po.id = process_order_tasks.process_order_id
        and po.company_id::text = auth.jwt()->>'company_id'
    )
  );

drop policy if exists process_order_events_company_select on process_order_events;
create policy process_order_events_company_select
  on process_order_events for select
  using (company_id::text = auth.jwt()->>'company_id');
