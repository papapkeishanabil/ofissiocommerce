-- Task E: Biteship carrier shipping persistence.
-- Apply manually in the Supabase SQL Editor after reviewing the target project.

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
  currency text not null default 'IDR' check (currency = 'IDR'),
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
  shipment_status text not null check (
    shipment_status in (
      'waiting_shipment', 'shipment_created', 'pickup_scheduled', 'picked_up',
      'in_transit', 'out_for_delivery', 'delivered', 'delivery_failed',
      'returned', 'cancelled', 'manual_review'
    )
  ),
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

create index if not exists idx_shipping_quotes_order_created
  on shipping_quotes(order_id, created_at desc);
create index if not exists idx_shipping_quotes_company
  on shipping_quotes(company_id);
create unique index if not exists idx_shipping_shipments_provider_id
  on shipping_shipments(provider, provider_shipment_id)
  where provider_shipment_id is not null;
create index if not exists idx_shipping_shipments_company_status
  on shipping_shipments(company_id, shipment_status);
create index if not exists idx_shipping_events_shipment_created
  on shipping_events(shipment_id, created_at desc);
create unique index if not exists idx_shipping_events_webhook_unique
  on shipping_events(webhook_event_id)
  where webhook_event_id is not null;

alter table shipping_quotes enable row level security;
alter table shipping_shipments enable row level security;
alter table shipping_events enable row level security;

-- Customer-facing reads continue through company-scoped server endpoints.
-- All writes use the server-only Supabase service-role client.

