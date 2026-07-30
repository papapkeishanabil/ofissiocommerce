-- Ofissio Phase 22: Quotation & Invoice PDF document foundation.
-- Run manually in Supabase SQL Editor after reviewing for staging.
-- This migration does not modify KK-006 or /3d/kk-006.glb.

create table if not exists documents (
  id text primary key default gen_random_uuid()::text,
  company_id text not null,
  user_id text,
  document_type text not null check (
    document_type in (
      'quotation_pdf',
      'invoice_pdf',
      'production_order_pdf_future',
      'packing_slip_pdf_future'
    )
  ),
  entity_type text not null check (entity_type in ('quotation', 'order', 'process_order')),
  entity_id text not null,
  document_number text not null,
  template_id text not null check (
    template_id in ('quotation_default', 'invoice_default', 'invoice_ofissio_custom')
  ),
  file_id text not null,
  storage_bucket text not null,
  storage_key text not null,
  filename text not null,
  mime_type text not null default 'application/pdf',
  size_bytes bigint not null check (size_bytes >= 0),
  status text not null default 'generated' check (
    status in ('draft', 'generated', 'failed', 'expired', 'deleted')
  ),
  generated_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table quotations
  add column if not exists quotation_pdf_document_id text,
  add column if not exists quotation_pdf_generated_at timestamptz;

alter table orders
  add column if not exists invoice_pdf_document_id text,
  add column if not exists invoice_pdf_generated_at timestamptz;

create index if not exists idx_documents_company_id on documents(company_id);
create index if not exists idx_documents_entity on documents(entity_type, entity_id);
create index if not exists idx_documents_document_type on documents(document_type);
create index if not exists idx_documents_status on documents(status);
create index if not exists idx_documents_created_at on documents(created_at desc);
create index if not exists idx_documents_template_id on documents(template_id);
create index if not exists idx_documents_company_entity_type
  on documents(company_id, entity_type, entity_id, document_type, status);

alter table documents enable row level security;

-- Draft customer/company-scoped read policy for future Supabase JWT auth.
-- Current app access remains through server-side API guards and service role.
drop policy if exists documents_company_select on documents;
create policy documents_company_select
  on documents for select
  using (company_id::text = auth.jwt()->>'company_id');

-- Write operations are intentionally not exposed to anon/authenticated roles.
-- Supabase service role writes through Ofissio server-side document service.
