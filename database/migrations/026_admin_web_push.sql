-- Reconstructed from admin-push.service.ts and push-subscription/route.ts
-- at commit d1b7c33. Intended for the new self-hosted Supabase database.
-- Review and test in an isolated database before applying to production.
-- Subscriptions are managed through permission-checked server routes.

begin;

create table if not exists public.admin_push_subscriptions (
  -- The application supplies aps_<randomUUID()>; these IDs are text.
  id text primary key,
  user_id text not null,
  recipient_role text not null,
  endpoint text not null unique
    check (char_length(endpoint) between 1 and 2000),
  p256dh text not null
    check (char_length(p256dh) between 1 and 1000),
  auth text not null
    check (char_length(auth) between 1 and 1000),
  user_agent text
    check (user_agent is null or char_length(user_agent) <= 500),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_admin_push_subscriptions_active_recipient
  on public.admin_push_subscriptions (recipient_role, user_id)
  where active = true;

alter table public.admin_push_subscriptions enable row level security;
alter table public.admin_push_subscriptions force row level security;

-- No direct browser policies: the server uses Supabase's service_role.
revoke all privileges on table public.admin_push_subscriptions
  from public, anon, authenticated;
grant select, insert, update, delete on table public.admin_push_subscriptions
  to service_role;

-- The application explicitly updates updated_at on each subscription change.
-- IF NOT EXISTS does not validate an already-existing table's structure.
commit;
