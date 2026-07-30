-- Phase 20: Supabase Storage live metadata readiness.
--
-- Run manually in Supabase SQL Editor after reviewing. Do not run from Codex.
-- This migration only extends metadata tables; it does not move /3d/kk-006.glb.

alter table uploaded_files
  add column if not exists storage_provider text not null default 'mock',
  add column if not exists checksum text,
  add column if not exists scan_status text not null default 'skipped',
  add column if not exists sanitized_status text not null default 'not_required',
  add column if not exists deleted_at timestamptz;

alter table company_logos
  add column if not exists logo_type text not null default 'company_logo',
  add column if not exists is_default boolean not null default false,
  add column if not exists deleted_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'uploaded_files_storage_provider_check'
  ) then
    alter table uploaded_files
      add constraint uploaded_files_storage_provider_check
      check (storage_provider in ('mock', 'supabase', 's3'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'uploaded_files_scan_status_check'
  ) then
    alter table uploaded_files
      add constraint uploaded_files_scan_status_check
      check (scan_status in ('pending', 'clean', 'flagged', 'skipped'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'uploaded_files_sanitized_status_check'
  ) then
    alter table uploaded_files
      add constraint uploaded_files_sanitized_status_check
      check (sanitized_status in ('pending', 'sanitized', 'not_required', 'required'));
  end if;
end $$;

create index if not exists idx_uploaded_files_storage_provider
  on uploaded_files(storage_provider);
create index if not exists idx_uploaded_files_storage_bucket
  on uploaded_files(storage_bucket);
create index if not exists idx_uploaded_files_file_type
  on uploaded_files(file_type);
create index if not exists idx_uploaded_files_status
  on uploaded_files(status);
create index if not exists idx_uploaded_files_deleted_at
  on uploaded_files(deleted_at);
create index if not exists idx_uploaded_files_created_at
  on uploaded_files(created_at desc);

create index if not exists idx_company_logos_deleted_at
  on company_logos(deleted_at);
create index if not exists idx_company_logos_default
  on company_logos(company_id, is_default)
  where deleted_at is null;

-- RLS draft reminder:
-- - Customer reads/inserts must be scoped by company_id from trusted auth/session.
-- - Internal admins may read all companies through explicit internal admin APIs.
-- - Supabase service role performs server-side writes only.
-- - Storage buckets should remain private and accessed with signed URLs.
