-- Master standar ukuran Ofissio (size chart per jenis produk).
-- Run manually in the Supabase SQL Editor for staging/dev.
-- Singleton row id='global'; read by the storefront server, mutated only via
-- internal admin RBAC (mirrors moq_settings policy in 029).

create table if not exists size_chart_standards (
  id text primary key check (id = 'global'),
  standards jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into size_chart_standards (id, standards) values ('global', '[]') on conflict (id) do nothing;

alter table size_chart_standards enable row level security;

-- No browser/customer policy is added. The service-role server layer exposes
-- only the safe standards shape and protects mutations with internal RBAC.
