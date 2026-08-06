-- Task G1: Ginee Omnichannel read-only connector foundation.
-- Apply manually after 020_rls_final_security_review.sql.
-- This migration creates internal integration metadata only. It does not add
-- any Ginee write/update inventory or order operation.

create extension if not exists pgcrypto;

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

-- Keep these integration tables server-only. Admin access is mediated by
-- authenticated Ofissio API routes and the service-role repository.
drop policy if exists ginee_product_mappings_browser_access on public.ginee_product_mappings;
drop policy if exists ginee_order_snapshots_browser_access on public.ginee_order_snapshots;
drop policy if exists ginee_webhook_events_browser_access on public.ginee_webhook_events;
