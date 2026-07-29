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
  logo_file_id uuid,
  width_cm numeric(8, 2),
  height_cm numeric(8, 2),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  company_id uuid not null references companies(id) on delete restrict,
  user_id uuid not null references user_profiles(id) on delete restrict,
  status text not null,
  payment_status text not null,
  fulfillment_type text not null,
  transaction_mode text not null,
  subtotal integer not null check (subtotal >= 0),
  shipping_total integer not null default 0 check (shipping_total >= 0),
  tax_total integer not null default 0 check (tax_total >= 0),
  grand_total integer not null check (grand_total >= 0),
  selected_shipping_rate_json jsonb,
  woo_order_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
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
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  company_id uuid not null references companies(id) on delete restrict,
  provider text not null,
  status text not null,
  amount integer not null check (amount >= 0),
  reference_id text not null unique,
  provider_payment_id text,
  paid_at timestamptz,
  raw_safe_metadata_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  company_id uuid not null references companies(id) on delete restrict,
  provider text not null,
  service text not null,
  tracking_number text,
  status text not null,
  shipping_rate_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tracking_records (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  company_id uuid not null references companies(id) on delete restrict,
  status text not null,
  current_status text not null,
  next_step text,
  progress integer not null default 0 check (progress between 0 and 100),
  timeline_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id)
);

create table if not exists company_logos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  file_id uuid not null,
  label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists uploaded_files (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references user_profiles(id) on delete restrict,
  file_type text not null,
  original_filename text not null,
  storage_key text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  status text not null default 'pending_scan' check (status in ('pending_scan', 'active', 'rejected', 'deleted')),
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'company_logos_file_fk'
  ) then
    alter table company_logos
      add constraint company_logos_file_fk
      foreign key (file_id) references uploaded_files(id) on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cart_item_customizations_logo_file_fk'
  ) then
    alter table cart_item_customizations
      add constraint cart_item_customizations_logo_file_fk
      foreign key (logo_file_id) references uploaded_files(id) on delete set null;
  end if;
end $$;

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id text,
  actor_type text not null check (actor_type in ('customer', 'internal', 'system')),
  company_id uuid,
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
create index if not exists idx_tracking_records_company_id on tracking_records(company_id);
create index if not exists idx_tracking_records_order_id on tracking_records(order_id);
create index if not exists idx_uploaded_files_company_id on uploaded_files(company_id);
create index if not exists idx_audit_logs_company_created_at on audit_logs(company_id, created_at desc);
create index if not exists idx_audit_logs_entity on audit_logs(entity_type, entity_id);

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
-- Customer policies must filter rows by company_id derived from server/session,
-- never from untrusted request body.
