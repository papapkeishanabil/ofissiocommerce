-- Ofissio migration 003: quotation management + convert-to-order foundation.
--
-- Manual procedure only:
-- 1. Review this file.
-- 2. Run in Supabase SQL Editor for staging/dev when ready.
-- 3. Do not run automatically from Codex.
--
-- The app remains backward-compatible before this migration because Phase 17
-- writes canonical quotation data to quotations.quotation_json.

alter table quotations
  add column if not exists internal_notes_json jsonb not null default '[]'::jsonb,
  add column if not exists sales_notes text,
  add column if not exists customer_message text,
  add column if not exists subtotal numeric(14,2),
  add column if not exists discount_total numeric(14,2) not null default 0,
  add column if not exists tax_total numeric(14,2) not null default 0,
  add column if not exists shipping_estimate numeric(14,2) not null default 0,
  add column if not exists grand_total numeric(14,2),
  add column if not exists currency text not null default 'IDR',
  add column if not exists valid_until timestamptz,
  add column if not exists sales_email text,
  add column if not exists customer_email text,
  add column if not exists accepted_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists converted_order_id text,
  add column if not exists woo_order_id text;

alter table quotation_items
  add column if not exists unit_price numeric(14,2),
  add column if not exists line_subtotal numeric(14,2),
  add column if not exists discount_amount numeric(14,2) not null default 0,
  add column if not exists final_unit_price numeric(14,2),
  add column if not exists final_line_total numeric(14,2),
  add column if not exists logo_file_id text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Phase 17 introduces the customer-facing "quote ready" email template.
-- Existing Phase 14 schemas may still have the older generated check name.
alter table email_logs
  drop constraint if exists email_logs_type_check;

alter table email_logs
  add constraint email_logs_type_check
  check (
    type in (
      'quotation_request_sales',
      'quotation_confirmation_customer',
      'quotation_ready_customer',
      'payment_received_customer',
      'order_tracking_update_customer',
      'upload_notification_internal',
      'test_email'
    )
  );

create table if not exists quotation_events (
  id text primary key,
  quotation_id text not null references quotations(id) on delete cascade,
  -- Keep text to match quotations.company_id and mock-compatible company IDs.
  -- Do not FK this to companies(id) yet because companies.id is uuid in the
  -- current Supabase schema. Add the FK only after the final production ID
  -- strategy migrates quotation ownership consistently.
  company_id text not null,
  actor_id text,
  actor_type text not null check (actor_type in ('internal', 'customer', 'system')),
  event_type text not null check (
    event_type in (
      'submitted',
      'status_changed',
      'pricing_updated',
      'emailed_to_customer',
      'customer_accepted',
      'customer_rejected',
      'converted_to_order',
      'internal_note_added'
    )
  ),
  old_status text,
  new_status text,
  note text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_quotation_events_quotation_id
  on quotation_events(quotation_id);
create index if not exists idx_quotation_events_company_id
  on quotation_events(company_id);
create index if not exists idx_quotation_events_event_type
  on quotation_events(event_type);
create index if not exists idx_quotation_events_created_at
  on quotation_events(created_at desc);
create index if not exists idx_quotations_valid_until
  on quotations(valid_until);
create index if not exists idx_quotations_converted_order_id
  on quotations(converted_order_id);

alter table quotation_events enable row level security;

-- Draft RLS. Production policies should be reviewed with the final auth model.
drop policy if exists quotation_events_company_select on quotation_events;
create policy quotation_events_company_select
  on quotation_events for select
  using (company_id::text = auth.jwt()->>'company_id');

drop policy if exists quotation_events_company_insert on quotation_events;
create policy quotation_events_company_insert
  on quotation_events for insert
  with check (company_id::text = auth.jwt()->>'company_id');

-- Service role bypasses RLS in Supabase. Internal admin all-company access is
-- enforced by Ofissio API guards, not by client-side Supabase access.
