begin;
-- Additive: old rows continue using automatic metadata. Existing RLS/grants remain.
alter table public.catalog_category_metadata
  add column if not exists seo jsonb not null default '{}'::jsonb;
notify pgrst, 'reload schema';
commit;
