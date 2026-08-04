-- Customer account profile and address persistence.
-- Safe to run after the existing auth/company migrations.

alter table public.companies
  add column if not exists phone text,
  add column if not exists pic_name text,
  add column if not exists pic_email text,
  add column if not exists pic_whatsapp text,
  add column if not exists profile_completed_at timestamptz;

alter table public.company_addresses
  add column if not exists is_default_shipping boolean not null default false,
  add column if not exists is_default_billing boolean not null default false;

-- Preserve the legacy default address as both defaults during migration.
update public.company_addresses
set
  is_default_shipping = true,
  is_default_billing = true
where is_default = true;

comment on column public.companies.profile_completed_at is
  'Timestamp when the customer completed the company profile required for checkout.';
comment on column public.company_addresses.is_default_shipping is
  'Company-scoped default shipping address.';
comment on column public.company_addresses.is_default_billing is
  'Company-scoped default billing address.';
