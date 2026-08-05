-- Task F: final RLS and direct-database access boundary.
--
-- Apply manually in the Supabase SQL Editor after migrations 001-019.
-- Application mutations remain behind Ofissio server APIs using the service
-- role. Authenticated browser clients receive only the explicitly listed
-- read policies below; internal/admin tables and event tables stay server-only.

create or replace function public.ofissio_has_company_access(target_company_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.company_memberships membership
    where membership.auth_user_id = auth.uid()
      and membership.status = 'active'
      and membership.company_id::text = target_company_id
  );
$$;

create or replace function public.ofissio_owns_cart(target_cart_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.carts cart
    join public.company_memberships membership
      on membership.company_id = cart.company_id
     and membership.user_profile_id = cart.user_id
    where cart.id = target_cart_id
      and membership.auth_user_id = auth.uid()
      and membership.status = 'active'
  );
$$;

create or replace function public.ofissio_owns_cart_item(target_cart_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.cart_items item
    where item.id = target_cart_item_id
      and public.ofissio_owns_cart(item.cart_id)
  );
$$;

create or replace function public.ofissio_has_order_access(target_order_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.orders customer_order
    where customer_order.id = target_order_id
      and public.ofissio_has_company_access(customer_order.company_id::text)
  );
$$;

create or replace function public.ofissio_has_quotation_access(target_quotation_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.quotations quotation
    where quotation.id = target_quotation_id
      and public.ofissio_has_company_access(quotation.company_id::text)
  );
$$;

revoke all on function public.ofissio_has_company_access(text) from public;
revoke all on function public.ofissio_owns_cart(uuid) from public;
revoke all on function public.ofissio_owns_cart_item(uuid) from public;
revoke all on function public.ofissio_has_order_access(text) from public;
revoke all on function public.ofissio_has_quotation_access(text) from public;
grant execute on function public.ofissio_has_company_access(text) to authenticated, service_role;
grant execute on function public.ofissio_owns_cart(uuid) to authenticated, service_role;
grant execute on function public.ofissio_owns_cart_item(uuid) to authenticated, service_role;
grant execute on function public.ofissio_has_order_access(text) to authenticated, service_role;
grant execute on function public.ofissio_has_quotation_access(text) to authenticated, service_role;

-- Keep the database role constraint aligned with the application RBAC model.
alter table public.internal_user_profiles
  drop constraint if exists internal_user_profiles_role_check;
alter table public.internal_user_profiles
  add constraint internal_user_profiles_role_check check (
    role in (
      'super_admin', 'sales_admin', 'finance_admin', 'sales',
      'finance_internal', 'product_admin', 'production_admin', 'ppic',
      'qc', 'logistics', 'support'
    )
  );

-- Every company/customer, operational, event, and internal table is protected.
alter table public.companies enable row level security;
alter table public.user_profiles enable row level security;
alter table public.company_users enable row level security;
alter table public.company_addresses enable row level security;
alter table public.company_memberships enable row level security;
alter table public.internal_user_profiles enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.cart_item_size_matrix enable row level security;
alter table public.cart_item_customizations enable row level security;
alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;
alter table public.quotation_events enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.documents enable row level security;
alter table public.uploaded_files enable row level security;
alter table public.company_logos enable row level security;
alter table public.shipments enable row level security;
alter table public.shipment_events enable row level security;
alter table public.shipping_quotes enable row level security;
alter table public.shipping_shipments enable row level security;
alter table public.shipping_events enable row level security;
alter table public.tracking_records enable row level security;
alter table public.process_orders enable row level security;
alter table public.process_order_items enable row level security;
alter table public.process_order_tasks enable row level security;
alter table public.process_order_events enable row level security;
alter table public.email_logs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.woo_sync_logs enable row level security;
alter table public.admin_notifications enable row level security;

alter table public.companies force row level security;
alter table public.user_profiles force row level security;
alter table public.company_users force row level security;
alter table public.company_addresses force row level security;
alter table public.company_memberships force row level security;
alter table public.internal_user_profiles force row level security;
alter table public.carts force row level security;
alter table public.cart_items force row level security;
alter table public.cart_item_size_matrix force row level security;
alter table public.cart_item_customizations force row level security;
alter table public.quotations force row level security;
alter table public.quotation_items force row level security;
alter table public.quotation_events force row level security;
alter table public.orders force row level security;
alter table public.order_items force row level security;
alter table public.payments force row level security;
alter table public.payment_events force row level security;
alter table public.documents force row level security;
alter table public.uploaded_files force row level security;
alter table public.company_logos force row level security;
alter table public.shipments force row level security;
alter table public.shipment_events force row level security;
alter table public.shipping_quotes force row level security;
alter table public.shipping_shipments force row level security;
alter table public.shipping_events force row level security;
alter table public.tracking_records force row level security;
alter table public.process_orders force row level security;
alter table public.process_order_items force row level security;
alter table public.process_order_tasks force row level security;
alter table public.process_order_events force row level security;
alter table public.email_logs force row level security;
alter table public.audit_logs force row level security;
alter table public.woo_sync_logs force row level security;
alter table public.admin_notifications force row level security;

-- Remove older direct-browser write policies and JWT-claim-only policies.
drop policy if exists uploaded_files_company_insert on public.uploaded_files;
drop policy if exists carts_owner_write on public.carts;
drop policy if exists quotation_events_company_insert on public.quotation_events;
drop policy if exists payment_events_company_insert on public.payment_events;
drop policy if exists woo_sync_logs_company_insert on public.woo_sync_logs;
drop policy if exists uploaded_files_company_select on public.uploaded_files;
drop policy if exists documents_company_select on public.documents;
drop policy if exists quotation_events_company_select on public.quotation_events;
drop policy if exists payment_events_company_select on public.payment_events;
drop policy if exists shipments_company_select on public.shipments;
drop policy if exists shipment_events_company_select on public.shipment_events;
drop policy if exists process_orders_company_select on public.process_orders;
drop policy if exists process_order_items_company_select on public.process_order_items;
drop policy if exists process_order_tasks_company_select on public.process_order_tasks;
drop policy if exists process_order_events_company_select on public.process_order_events;
drop policy if exists woo_sync_logs_company_select on public.woo_sync_logs;

-- Replace all customer-facing policies with membership-backed scope checks.
drop policy if exists company_memberships_self_select on public.company_memberships;
create policy company_memberships_self_select
  on public.company_memberships for select to authenticated
  using (auth_user_id = auth.uid() and status = 'active');

drop policy if exists user_profiles_self_select on public.user_profiles;
create policy user_profiles_self_select
  on public.user_profiles for select to authenticated
  using (auth_user_id = auth.uid() and status = 'active');

drop policy if exists companies_member_select on public.companies;
create policy companies_member_select
  on public.companies for select to authenticated
  using (public.ofissio_has_company_access(id::text));

drop policy if exists company_users_member_select on public.company_users;
create policy company_users_member_select
  on public.company_users for select to authenticated
  using (public.ofissio_has_company_access(company_id::text));

drop policy if exists company_addresses_company_select on public.company_addresses;
create policy company_addresses_company_select
  on public.company_addresses for select to authenticated
  using (public.ofissio_has_company_access(company_id::text));

drop policy if exists carts_owner_select on public.carts;
create policy carts_owner_select
  on public.carts for select to authenticated
  using (public.ofissio_owns_cart(id));

drop policy if exists cart_items_owner_select on public.cart_items;
create policy cart_items_owner_select
  on public.cart_items for select to authenticated
  using (public.ofissio_owns_cart(cart_id));

drop policy if exists cart_item_size_matrix_owner_select on public.cart_item_size_matrix;
create policy cart_item_size_matrix_owner_select
  on public.cart_item_size_matrix for select to authenticated
  using (public.ofissio_owns_cart_item(cart_item_id));

drop policy if exists cart_item_customizations_owner_select on public.cart_item_customizations;
create policy cart_item_customizations_owner_select
  on public.cart_item_customizations for select to authenticated
  using (public.ofissio_owns_cart_item(cart_item_id));

drop policy if exists quotations_company_select on public.quotations;
create policy quotations_company_select
  on public.quotations for select to authenticated
  using (public.ofissio_has_company_access(company_id::text));

drop policy if exists quotation_items_company_select on public.quotation_items;
create policy quotation_items_company_select
  on public.quotation_items for select to authenticated
  using (public.ofissio_has_quotation_access(quotation_id));

drop policy if exists orders_company_select on public.orders;
create policy orders_company_select
  on public.orders for select to authenticated
  using (public.ofissio_has_company_access(company_id::text));

drop policy if exists order_items_company_select on public.order_items;
create policy order_items_company_select
  on public.order_items for select to authenticated
  using (public.ofissio_has_order_access(order_id));

drop policy if exists payments_company_select on public.payments;
create policy payments_company_select
  on public.payments for select to authenticated
  using (public.ofissio_has_company_access(company_id::text));

drop policy if exists tracking_records_company_select on public.tracking_records;
create policy tracking_records_company_select
  on public.tracking_records for select to authenticated
  using (public.ofissio_has_company_access(company_id::text));

drop policy if exists company_logos_company_select on public.company_logos;
create policy company_logos_company_select
  on public.company_logos for select to authenticated
  using (public.ofissio_has_company_access(company_id::text));

drop policy if exists shipping_quotes_company_select on public.shipping_quotes;
create policy shipping_quotes_company_select
  on public.shipping_quotes for select to authenticated
  using (public.ofissio_has_company_access(company_id::text));

drop policy if exists shipping_shipments_company_select on public.shipping_shipments;
create policy shipping_shipments_company_select
  on public.shipping_shipments for select to authenticated
  using (public.ofissio_has_company_access(company_id::text));

-- These tables intentionally have no authenticated browser policy because they
-- contain storage keys, internal notes, provider events, or operational data:
-- uploaded_files, documents, quotation_events, payment_events, shipments,
-- shipment_events, shipping_events, process_*, email_logs, audit_logs,
-- woo_sync_logs, admin_notifications, internal_user_profiles.

-- Customer assets stay private. Custom bucket names must also be kept private
-- in the Supabase dashboard; check:storage verifies the active env names.
update storage.buckets
set public = false
where id in (
  'ofissio-logos',
  'ofissio-artwork',
  'ofissio-documents',
  'ofissio-3d-models'
);

do $$
declare
  storage_policy record;
begin
  for storage_policy in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (
        coalesce(qual, '') ~ '(ofissio-logos|ofissio-artwork|ofissio-documents|ofissio-3d-models)'
        or coalesce(with_check, '') ~ '(ofissio-logos|ofissio-artwork|ofissio-documents|ofissio-3d-models)'
      )
  loop
    execute format('drop policy if exists %I on storage.objects', storage_policy.policyname);
  end loop;
end $$;

-- Server-only inventory used by scripts/check-rls.ts. It exposes no row data.
create or replace function public.ofissio_rls_security_inventory()
returns table (
  table_name text,
  rls_enabled boolean,
  rls_forced boolean,
  policy_count bigint,
  write_policy_count bigint,
  anonymous_policy_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with wanted(table_name) as (
    select unnest(array[
      'companies', 'user_profiles', 'company_users', 'company_addresses',
      'company_memberships', 'internal_user_profiles', 'carts', 'cart_items',
      'cart_item_size_matrix', 'cart_item_customizations', 'quotations',
      'quotation_items', 'quotation_events', 'orders', 'order_items',
      'payments', 'payment_events', 'documents', 'uploaded_files',
      'company_logos', 'shipments', 'shipment_events', 'shipping_quotes',
      'shipping_shipments', 'shipping_events', 'tracking_records',
      'process_orders', 'process_order_items', 'process_order_tasks',
      'process_order_events', 'email_logs', 'audit_logs', 'woo_sync_logs',
      'admin_notifications'
    ]::text[])
  )
  select
    wanted.table_name,
    coalesce(pg_class.relrowsecurity, false),
    coalesce(pg_class.relforcerowsecurity, false),
    (
      select count(*)
      from pg_policies policy
      where policy.schemaname = 'public'
        and policy.tablename = wanted.table_name
    ),
    (
      select count(*)
      from pg_policies policy
      where policy.schemaname = 'public'
        and policy.tablename = wanted.table_name
        and policy.cmd <> 'SELECT'
    ),
    (
      select count(*)
      from pg_policies policy
      where policy.schemaname = 'public'
        and policy.tablename = wanted.table_name
        and (policy.roles @> array['anon']::name[] or policy.roles @> array['public']::name[])
    )
  from wanted
  left join pg_class
    on pg_class.relname = wanted.table_name
   and pg_class.relnamespace = 'public'::regnamespace
  order by wanted.table_name;
$$;

revoke all on function public.ofissio_rls_security_inventory() from public;
grant execute on function public.ofissio_rls_security_inventory() to service_role;
