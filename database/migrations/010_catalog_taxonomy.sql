-- Ofissio Task A2.5: Catalog taxonomy, industry, and synonym foundation.
--
-- Manual procedure only:
-- 1. Review this file.
-- 2. Run it once in the Supabase SQL Editor for staging/dev.
-- 3. Do not run automatically from Codex.
-- 4. WooCommerce remains the source of product categories and attributes.
-- 5. These tables contain Ofissio-only metadata and industry master data.

create table if not exists catalog_category_metadata (
  id text primary key,
  woo_category_id bigint not null unique,
  category_slug text not null,
  active boolean not null default true,
  synonyms text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_catalog_category_metadata_slug
  on catalog_category_metadata(category_slug);
create index if not exists idx_catalog_category_metadata_active
  on catalog_category_metadata(active);

create table if not exists industries (
  id text primary key,
  name text not null,
  slug text not null unique,
  description text not null default '',
  active boolean not null default true,
  synonyms text[] not null default '{}',
  sort_order integer not null default 100 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_industries_active_sort
  on industries(active, sort_order, name);

insert into industries (
  id, name, slug, description, active, synonyms, sort_order
) values
  ('industry-corporate', 'Corporate', 'corporate', 'Seragam kantor dan kebutuhan perusahaan.', true, array['kantor','perusahaan','office','corporate'], 10),
  ('industry-mining', 'Mining', 'mining', 'Workwear untuk pertambangan dan site.', true, array['tambang','pertambangan','mining','batubara','batu bara'], 20),
  ('industry-manufacturing', 'Manufacturing', 'manufacturing', 'Seragam manufaktur dan pabrik.', true, array['manufaktur','manufacturing','pabrik'], 30),
  ('industry-hospitality', 'Hospitality', 'hospitality', 'Seragam hotel dan layanan hospitality.', true, array['hotel','restoran','cafe','hospitality'], 40),
  ('industry-healthcare', 'Healthcare', 'healthcare', 'Seragam kesehatan dan fasilitas medis.', true, array['kesehatan','healthcare','rumah sakit','klinik','medis'], 50),
  ('industry-education', 'Education', 'education', 'Seragam institusi pendidikan.', true, array['pendidikan','education','sekolah','kampus'], 60),
  ('industry-construction', 'Construction', 'construction', 'Workwear proyek dan konstruksi.', true, array['proyek','konstruksi','kontraktor','lapangan','construction'], 70),
  ('industry-logistics', 'Logistics', 'logistics', 'Seragam logistik dan pergudangan.', true, array['logistik','logistics','gudang','kurir'], 80),
  ('industry-security', 'Security', 'security', 'Seragam keamanan dan petugas security.', true, array['security','satpam','keamanan'], 90),
  ('industry-government', 'Government', 'government', 'Seragam instansi pemerintahan.', true, array['pemerintah','pemerintahan','government','instansi'], 100),
  ('industry-retail', 'Retail', 'retail', 'Seragam toko dan operasional retail.', true, array['retail','toko','store'], 110),
  ('industry-food-beverage', 'Food & Beverage', 'food-beverage', 'Seragam industri makanan dan minuman.', true, array['f&b','fnb','food beverage','makanan','minuman','restoran','cafe'], 120)
on conflict (slug) do nothing;

alter table catalog_category_metadata enable row level security;
alter table industries enable row level security;

-- No customer direct policy is intentionally added. Service-role server routes
-- read these global tables, filter active rows, and expose a safe public shape.
