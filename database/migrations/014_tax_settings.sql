-- Global quotation tax defaults. Each quotation keeps its own JSON snapshot so
-- changing this table never mutates an existing commercial offer.
create table if not exists tax_settings (
  id text primary key,
  enabled boolean not null default true,
  rate numeric(5,2) not null default 11 check (rate >= 0 and rate <= 100),
  label text not null default 'PPN',
  calculation_basis text not null default 'after_discount'
    check (calculation_basis = 'after_discount'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into tax_settings (id, enabled, rate, label, calculation_basis)
values ('default', true, 11, 'PPN', 'after_discount')
on conflict (id) do nothing;

alter table tax_settings enable row level security;
