-- Bulk product import control-plane only. WooCommerce remains the product,
-- variation and permanent image repository.
create table if not exists product_import_batches (
  id uuid primary key,
  company_id uuid null references companies(id) on delete set null,
  source text not null default 'woocommerce' check (source = 'woocommerce'),
  status text not null check (status in ('PREVIEWED','DRY_RUN_PASSED','UPLOADING','IMPORTING','COMPLETED','COMPLETED_WITH_WARNINGS','FAILED','CANCELLED')),
  csv_filename text not null,
  manifest_filename text not null,
  zip_filename text not null,
  csv_sha256 text not null,
  manifest_sha256 text not null,
  zip_sha256 text not null,
  total_products integer not null default 0,
  total_variations integer not null default 0,
  total_images integer not null default 0,
  warning_count integer not null default 0,
  error_count integer not null default 0,
  plan_json jsonb not null default '{}'::jsonb,
  result_json jsonb not null default '{}'::jsonb,
  staging_objects jsonb not null default '[]'::jsonb,
  cleanup_required boolean not null default false,
  created_by text not null,
  created_at timestamptz not null default now(),
  started_at timestamptz null,
  completed_at timestamptz null,
  updated_at timestamptz not null default now()
);

create table if not exists product_import_items (
  id uuid primary key,
  batch_id uuid not null references product_import_batches(id) on delete cascade,
  source_id text not null,
  source_sku text null,
  target_sku text null,
  target_product_id text null,
  action text not null check (action in ('CREATE_DRAFT','SKIP_EXISTING','SKIP_NEEDS_PRODUCT_DATA','SKIP_UNSUPPORTED','BLOCKED')),
  status text not null default 'PENDING' check (status in ('PENDING','UPLOADING','IMPORTED','SKIPPED','FAILED')),
  warning_count integer not null default 0,
  error_message text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, source_id)
);

create index if not exists idx_product_import_batches_created_desc on product_import_batches(created_at desc);
create index if not exists idx_product_import_batches_status on product_import_batches(status);
create index if not exists idx_product_import_items_batch on product_import_items(batch_id);
create index if not exists idx_product_import_items_target_sku on product_import_items(target_sku);

alter table product_import_batches enable row level security;
alter table product_import_batches force row level security;
alter table product_import_items enable row level security;
alter table product_import_items force row level security;
-- Intentionally no browser policies. Access is service-role server code after
-- internal RBAC checks; service-role is never exposed to the client.

insert into storage.buckets (id, name, public)
values ('ofissio-product-imports', 'ofissio-product-imports', false)
on conflict (id) do update set public = false;
