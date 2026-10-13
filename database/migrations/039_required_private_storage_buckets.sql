-- Ofissio migration 039: provision missing private application buckets.
-- Required by scripts/check-storage.ts at application commit d1b7c33.
-- Migrations 020 and schema.sql previously only updated these bucket IDs.
-- Test in the isolated migration database before production installation.
-- No files are copied, deleted or uploaded; no browser policy is added.
-- Existing per-bucket size/MIME settings are preserved on repeated runs.
-- New buckets inherit the global Storage upload limit; application limits
-- must also be checked before launch.

begin;

insert into storage.buckets (id, name, public)
values
  ('ofissio-logos', 'ofissio-logos', false),
  ('ofissio-artwork', 'ofissio-artwork', false),
  ('ofissio-documents', 'ofissio-documents', false)
on conflict (id) do update set public = false;

commit;
