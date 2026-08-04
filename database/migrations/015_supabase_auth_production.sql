-- Task D: Supabase Auth production finalization.
-- Apply manually to staging after reviewing the role assignments.

create extension if not exists pgcrypto;

create unique index if not exists idx_user_profiles_auth_user_id_unique
  on user_profiles(auth_user_id)
  where auth_user_id is not null;

create table if not exists company_memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_profile_id uuid not null references user_profiles(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('customer_user', 'customer_admin')),
  status text not null default 'active' check (status in ('active', 'inactive', 'invited')),
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz,
  last_accessed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, auth_user_id),
  unique(company_id, user_profile_id)
);

create table if not exists internal_user_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null check (role in ('sales_admin', 'production_admin', 'finance_admin', 'super_admin')),
  status text not null default 'active' check (status in ('active', 'inactive', 'invited')),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_company_memberships_auth_user
  on company_memberships(auth_user_id, status);
create index if not exists idx_company_memberships_company
  on company_memberships(company_id, status);
create index if not exists idx_internal_user_profiles_role
  on internal_user_profiles(role, status);

alter table companies enable row level security;
alter table user_profiles enable row level security;
alter table company_users enable row level security;
alter table company_memberships enable row level security;
alter table internal_user_profiles enable row level security;
alter table quotations enable row level security;
alter table orders enable row level security;
alter table uploaded_files enable row level security;
alter table carts enable row level security;
alter table cart_items enable row level security;
alter table payments enable row level security;

drop policy if exists company_memberships_self_select on company_memberships;
create policy company_memberships_self_select
  on company_memberships for select
  using (auth_user_id = auth.uid() and status = 'active');

drop policy if exists user_profiles_self_select on user_profiles;
create policy user_profiles_self_select
  on user_profiles for select
  using (auth_user_id = auth.uid());

drop policy if exists companies_member_select on companies;
create policy companies_member_select
  on companies for select
  using (
    exists (
      select 1 from company_memberships membership
      where membership.company_id = companies.id
        and membership.auth_user_id = auth.uid()
        and membership.status = 'active'
    )
  );

drop policy if exists company_users_member_select on company_users;
create policy company_users_member_select
  on company_users for select
  using (
    exists (
      select 1 from company_memberships membership
      where membership.company_id = company_users.company_id
        and membership.auth_user_id = auth.uid()
        and membership.status = 'active'
    )
  );

drop policy if exists quotations_company_select on quotations;
create policy quotations_company_select
  on quotations for select
  using (
    exists (
      select 1 from company_memberships membership
      where membership.company_id::text = quotations.company_id::text
        and membership.auth_user_id = auth.uid()
        and membership.status = 'active'
    )
  );

drop policy if exists orders_company_select on orders;
create policy orders_company_select
  on orders for select
  using (
    exists (
      select 1 from company_memberships membership
      where membership.company_id::text = orders.company_id::text
        and membership.auth_user_id = auth.uid()
        and membership.status = 'active'
    )
  );

drop policy if exists uploaded_files_company_select on uploaded_files;
create policy uploaded_files_company_select
  on uploaded_files for select
  using (
    exists (
      select 1 from company_memberships membership
      where membership.company_id::text = uploaded_files.company_id::text
        and membership.auth_user_id = auth.uid()
        and membership.status = 'active'
    )
  );

drop policy if exists uploaded_files_company_insert on uploaded_files;
create policy uploaded_files_company_insert
  on uploaded_files for insert
  with check (
    exists (
      select 1 from company_memberships membership
      where membership.company_id::text = uploaded_files.company_id::text
        and membership.auth_user_id = auth.uid()
        and membership.status = 'active'
        and membership.role in ('customer_user', 'customer_admin')
    )
  );

drop policy if exists carts_owner_select on carts;
create policy carts_owner_select
  on carts for select
  using (
    exists (
      select 1 from company_memberships membership
      where membership.company_id = carts.company_id
        and membership.user_profile_id = carts.user_id
        and membership.auth_user_id = auth.uid()
        and membership.status = 'active'
    )
  );

drop policy if exists carts_owner_write on carts;
create policy carts_owner_write
  on carts for all
  using (
    exists (
      select 1 from company_memberships membership
      where membership.company_id = carts.company_id
        and membership.user_profile_id = carts.user_id
        and membership.auth_user_id = auth.uid()
        and membership.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from company_memberships membership
      where membership.company_id = carts.company_id
        and membership.user_profile_id = carts.user_id
        and membership.auth_user_id = auth.uid()
        and membership.status = 'active'
    )
  );

drop policy if exists cart_items_owner_select on cart_items;
create policy cart_items_owner_select
  on cart_items for select
  using (
    exists (
      select 1 from carts cart
      join company_memberships membership
        on membership.company_id = cart.company_id
       and membership.user_profile_id = cart.user_id
      where cart.id = cart_items.cart_id
        and membership.auth_user_id = auth.uid()
        and membership.status = 'active'
    )
  );

drop policy if exists payments_company_select on payments;
create policy payments_company_select
  on payments for select
  using (
    exists (
      select 1 from company_memberships membership
      where membership.company_id::text = payments.company_id::text
        and membership.auth_user_id = auth.uid()
        and membership.status = 'active'
    )
  );

-- No direct browser policy is created for internal_user_profiles. Internal
-- identity and all admin data remain behind server routes using service role
-- plus server-side RBAC. Service role bypasses these RLS policies by design.
