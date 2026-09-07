-- Master MOQ per rute pengerjaan (STK/CUS/PRO) + batas minimum bordir.
-- Run manually in the Supabase SQL Editor for staging/dev.
-- Singleton row id='global'; read by the storefront server, mutated only via
-- internal admin RBAC (mirrors embroidery_pricing_zones policy in 011).

create table if not exists moq_settings (
  id text primary key check (id = 'global'),
  moq_fulfillment integer not null default 1 check (moq_fulfillment >= 1),
  moq_customization integer not null default 1 check (moq_customization >= 1),
  moq_production integer not null default 48 check (moq_production >= 1),
  moq_embroidery integer not null default 8 check (moq_embroidery >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into moq_settings (id) values ('global') on conflict (id) do nothing;

alter table moq_settings enable row level security;

-- No browser/customer policy is added. The service-role server layer exposes
-- only the safe settings shape and protects mutations with internal RBAC.
