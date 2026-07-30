-- Ofissio migration 008: iPaymu payment link, QR foundation, and callback events.
--
-- Manual procedure only:
-- 1. Review this file.
-- 2. Run in Supabase SQL Editor for staging/dev before enabling PAYMENT_PROVIDER=ipaymu.
-- 3. Do not commit real iPaymu credentials.
-- 4. Do not treat browser return URL as paid; only valid callbacks/server checks may update payment status.

alter table payments
  add column if not exists provider_transaction_id text,
  add column if not exists payment_url text,
  add column if not exists payment_qr_url text,
  add column if not exists payment_qr_data_url text,
  add column if not exists payment_qr_string text,
  add column if not exists payment_method text,
  add column if not exists payment_channel text,
  add column if not exists unique_code integer not null default 0,
  add column if not exists expired_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists callback_received_at timestamptz,
  add column if not exists callback_status text,
  add column if not exists callback_reference text,
  add column if not exists callback_amount integer,
  add column if not exists callback_raw_safe_json jsonb,
  add column if not exists invoice_document_id text;

create table if not exists payment_events (
  id text primary key,
  payment_id text not null references payments(id) on delete cascade,
  order_id text not null references orders(id) on delete cascade,
  company_id text not null,
  provider text not null check (provider in ('mock', 'ipaymu')),
  event_type text not null check (
    event_type in (
      'payment_created',
      'payment_link_created',
      'payment_callback_received',
      'payment_paid',
      'payment_failed',
      'payment_expired',
      'payment_cancelled',
      'payment_verification_failed',
      'invoice_regenerated_with_payment'
    )
  ),
  old_status text,
  new_status text,
  reference_id text not null,
  amount integer not null check (amount >= 0),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_payments_provider_payment_id
  on payments(provider, provider_payment_id);
create index if not exists idx_payments_provider_transaction_id
  on payments(provider, provider_transaction_id);
create index if not exists idx_payments_order_id
  on payments(order_id);
create index if not exists idx_payments_company_status
  on payments(company_id, status);
create index if not exists idx_payments_expired_at
  on payments(expired_at);

create index if not exists idx_payment_events_payment_id
  on payment_events(payment_id);
create index if not exists idx_payment_events_order_id
  on payment_events(order_id);
create index if not exists idx_payment_events_company_id
  on payment_events(company_id);
create index if not exists idx_payment_events_provider
  on payment_events(provider);
create index if not exists idx_payment_events_reference_id
  on payment_events(reference_id);
create index if not exists idx_payment_events_event_type
  on payment_events(event_type);
create index if not exists idx_payment_events_created_at
  on payment_events(created_at desc);

alter table payment_events enable row level security;

-- Draft RLS. Service role bypasses RLS; app routes enforce internal/customer guards.
drop policy if exists payment_events_company_select on payment_events;
create policy payment_events_company_select
  on payment_events for select
  using (company_id::text = auth.jwt()->>'company_id');

drop policy if exists payment_events_company_insert on payment_events;
create policy payment_events_company_insert
  on payment_events for insert
  with check (company_id::text = auth.jwt()->>'company_id');
