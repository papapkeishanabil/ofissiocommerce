-- Admin-editable homepage content (Opsi B / CMS).
-- One row per homepage section. The jsonb `data` column holds that section's
-- content; its shape is validated server-side by the field-schema registry in
-- src/features/site-content/content.schema.ts (the single source of truth for
-- defaults + zod schemas + admin form descriptors).
--
-- Defaults are NOT seeded here — they live in code (the registry), and the
-- service merges them in for any absent row. That keeps SQL and the registry
-- from drifting, and lets the homepage render unchanged before this migration
-- is applied (the repository returns source:"fallback", schemaReady:false).
--
-- Run manually in the Supabase SQL Editor for staging/dev.

create table if not exists site_content (
  section text primary key check (section in (
    'hero','trust','bisnis_naik_kelas','industri','paket','bordir',
    'cara_order','korporasi','produk_pilihan','cta'
  )),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table site_content enable row level security;

-- No browser/customer policy is added. The service-role server layer is the
-- sole reader/writer; admin mutation is gated by requireInternalAdmin RBAC in
-- the route handler (same posture as embroidery_pricing_zones, migration 011).
