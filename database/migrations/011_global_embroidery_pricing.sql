-- Task A4 revision: global embroidery pricing master.
-- Run manually in the Supabase SQL Editor for staging/dev.
-- Product-level embroidery_pricing metadata is intentionally preserved as legacy data.

create table if not exists embroidery_pricing_zones (
  id text primary key,
  zone_id text not null unique check (zone_id in (
    'left_chest', 'right_chest', 'left_sleeve', 'right_sleeve', 'upper_back', 'center_back'
  )),
  label text not null,
  enabled boolean not null default true,
  max_width_cm numeric(8,2) not null check (max_width_cm > 0),
  max_height_cm numeric(8,2) not null check (max_height_cm > 0),
  unit_price integer not null check (unit_price > 0),
  setup_fee integer not null default 0 check (setup_fee >= 0),
  show_setup_fee boolean not null default false,
  pricing_mode text not null default 'flat_per_piece' check (pricing_mode = 'flat_per_piece'),
  notes text not null default '',
  sort_order integer not null default 100 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_embroidery_pricing_zones_enabled_sort
  on embroidery_pricing_zones(enabled, sort_order, zone_id);

insert into embroidery_pricing_zones (
  id, zone_id, label, enabled, max_width_cm, max_height_cm,
  unit_price, setup_fee, show_setup_fee, pricing_mode, notes, sort_order
) values
  ('embroidery-left-chest', 'left_chest', 'Dada Kiri', true, 8, 8, 5000, 0, false, 'flat_per_piece', 'Logo kecil dada kiri', 10),
  ('embroidery-right-chest', 'right_chest', 'Dada Kanan', true, 8, 8, 5000, 0, false, 'flat_per_piece', 'Logo atau nama', 20),
  ('embroidery-left-sleeve', 'left_sleeve', 'Lengan Kiri', true, 7, 7, 6000, 0, false, 'flat_per_piece', 'Bordir lengan', 30),
  ('embroidery-right-sleeve', 'right_sleeve', 'Lengan Kanan', true, 7, 7, 6000, 0, false, 'flat_per_piece', 'Bordir lengan', 40),
  ('embroidery-upper-back', 'upper_back', 'Punggung Atas', true, 20, 8, 10000, 0, false, 'flat_per_piece', 'Logo sedang punggung atas', 50),
  ('embroidery-center-back', 'center_back', 'Punggung Tengah', true, 25, 20, 15000, 0, false, 'flat_per_piece', 'Logo besar punggung tengah', 60)
on conflict (zone_id) do nothing;

alter table embroidery_pricing_zones enable row level security;

-- No browser/customer policy is added. The service-role server layer exposes only
-- the safe public pricing shape and protects mutations with internal RBAC.
