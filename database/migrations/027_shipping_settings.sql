-- Courier services exposed by Ofissio checkout.
create table if not exists shipping_settings (
  id text primary key default 'default' check (id = 'default'),
  enabled_services jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table shipping_settings enable row level security;
alter table shipping_settings force row level security;

-- No browser policies: reads/writes use the server-side service role and RBAC.
