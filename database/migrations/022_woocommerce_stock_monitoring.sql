-- WooCommerce Stock Monitoring for Ofissio Admin.
-- Apply manually after 021_ginee_readonly_integration.sql.
-- Ginee remains upstream of WooCommerce; this table stores only internal
-- replenishment requests and never writes inventory back to WooCommerce/Ginee.

create table if not exists public.production_replenishment_requests (
  id text primary key,
  idempotency_key text not null unique,
  company_id text null,
  order_id text null references public.orders(id) on delete set null,
  parent_sku text not null check (char_length(parent_sku) between 2 and 128),
  stock_sku text not null check (char_length(stock_sku) between 2 and 128),
  size_label text null,
  required_qty integer not null check (required_qty >= 0),
  available_stock integer not null check (available_stock >= 0),
  shortage_qty integer not null check (shortage_qty > 0),
  reason text not null check (reason in ('low_stock', 'order_shortage', 'replenishment')),
  status text not null default 'requested' check (
    status in ('requested', 'approved', 'in_progress', 'completed', 'cancelled')
  ),
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists production_replenishment_order_idx
  on public.production_replenishment_requests(order_id, created_at desc);
create index if not exists production_replenishment_stock_sku_idx
  on public.production_replenishment_requests(stock_sku, status, created_at desc);

alter table public.production_replenishment_requests enable row level security;
alter table public.production_replenishment_requests force row level security;
revoke all on table public.production_replenishment_requests from anon, authenticated;
grant all on table public.production_replenishment_requests to service_role;

-- Browser roles never access this internal operational table directly. Admin
-- requests are mediated by server-side RBAC and the service-role repository.
drop policy if exists production_replenishment_browser_access
  on public.production_replenishment_requests;
