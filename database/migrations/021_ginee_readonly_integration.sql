-- Task G1 revision: Ginee Inventory Read-Only Stock Check.
-- Apply manually after 020_rls_final_security_review.sql.
-- No order import, webhook processing, stock mutation, or two-way sync is
-- introduced by this migration.

create extension if not exists pgcrypto;

create table if not exists public.ginee_product_mappings (
  id uuid primary key default gen_random_uuid(),
  parent_sku text not null check (char_length(parent_sku) between 2 and 128),
  stock_sku text not null check (char_length(stock_sku) between 2 and 128),
  size_label text null,
  color_label text null,
  woocommerce_product_id text null,
  woocommerce_variation_id text null,
  ginee_sku text not null check (char_length(ginee_sku) between 2 and 128),
  ginee_warehouse_id text null,
  last_stock integer null check (last_stock is null or last_stock >= 0),
  last_checked_at timestamptz null,
  sync_stock_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ginee_product_mappings_inventory_readonly
    check (sync_stock_enabled = false)
);

-- Compatibility when the initial, broader G1 draft was already applied.
alter table public.ginee_product_mappings add column if not exists last_stock integer null;
alter table public.ginee_product_mappings add column if not exists last_checked_at timestamptz null;

create unique index if not exists ginee_product_mappings_identity_uidx
  on public.ginee_product_mappings (stock_sku, ginee_sku, coalesce(ginee_warehouse_id, ''));
create index if not exists ginee_product_mappings_stock_sku_idx on public.ginee_product_mappings (stock_sku);
create index if not exists ginee_product_mappings_parent_sku_idx on public.ginee_product_mappings (parent_sku);
create index if not exists ginee_product_mappings_ginee_sku_idx on public.ginee_product_mappings (ginee_sku);
create index if not exists ginee_product_mappings_woo_product_idx on public.ginee_product_mappings (woocommerce_product_id);

create table if not exists public.ginee_inventory_snapshots (
  id uuid primary key default gen_random_uuid(),
  mapping_id uuid null references public.ginee_product_mappings(id) on delete set null,
  stock_sku text not null check (char_length(stock_sku) between 2 and 128),
  ginee_sku text not null check (char_length(ginee_sku) between 2 and 128),
  ginee_warehouse_id text null,
  warehouse_name text null,
  warehouse_stock integer not null default 0 check (warehouse_stock >= 0),
  available_stock integer not null default 0 check (available_stock >= 0),
  reserved_stock integer not null default 0 check (reserved_stock >= 0),
  locked_stock integer not null default 0 check (locked_stock >= 0),
  checked_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists ginee_inventory_snapshots_stock_sku_idx
  on public.ginee_inventory_snapshots (stock_sku, checked_at desc);
create index if not exists ginee_inventory_snapshots_ginee_sku_idx
  on public.ginee_inventory_snapshots (ginee_sku, checked_at desc);
create index if not exists ginee_inventory_snapshots_mapping_idx
  on public.ginee_inventory_snapshots (mapping_id, checked_at desc);

alter table public.ginee_product_mappings enable row level security;
alter table public.ginee_product_mappings force row level security;
alter table public.ginee_inventory_snapshots enable row level security;
alter table public.ginee_inventory_snapshots force row level security;

revoke all on table public.ginee_product_mappings from anon, authenticated;
revoke all on table public.ginee_inventory_snapshots from anon, authenticated;
grant all on table public.ginee_product_mappings to service_role;
grant all on table public.ginee_inventory_snapshots to service_role;

-- These tables remain server-only. Ofissio Admin access is mediated by
-- authenticated API routes and the service-role repository.
drop policy if exists ginee_product_mappings_browser_access on public.ginee_product_mappings;
drop policy if exists ginee_inventory_snapshots_browser_access on public.ginee_inventory_snapshots;

-- Existing ginee_order_snapshots/ginee_webhook_events tables from an earlier
-- draft are intentionally not dropped here to avoid destructive data loss.
-- The application no longer reads or writes those legacy tables.
