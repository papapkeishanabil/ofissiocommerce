-- Task A6.1: persistent internal admin notifications.
-- Run manually in the Supabase SQL Editor for staging/dev.

create table if not exists admin_notifications (
  id text primary key,
  type text not null check (type in (
    'order_created', 'quotation_accepted', 'payment_paid',
    'shipment_created', 'system_warning'
  )),
  title text not null,
  message text not null,
  entity_type text not null,
  entity_id text not null,
  entity_number text null,
  severity text not null default 'info' check (severity in (
    'info', 'success', 'warning', 'error'
  )),
  status text not null default 'unread' check (status in (
    'unread', 'read', 'acknowledged', 'resolved'
  )),
  recipient_role text null,
  recipient_user_id text null,
  metadata jsonb not null default '{}'::jsonb,
  email_status text not null default 'not_required' check (email_status in (
    'not_required', 'pending', 'sent', 'mocked', 'failed'
  )),
  email_id text null,
  email_error text null,
  created_at timestamptz not null default now(),
  read_at timestamptz null,
  acknowledged_at timestamptz null,
  resolved_at timestamptz null,
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_admin_notifications_entity_unique
  on admin_notifications(type, entity_type, entity_id);
create index if not exists idx_admin_notifications_type
  on admin_notifications(type);
create index if not exists idx_admin_notifications_status
  on admin_notifications(status);
create index if not exists idx_admin_notifications_severity
  on admin_notifications(severity);
create index if not exists idx_admin_notifications_entity
  on admin_notifications(entity_type, entity_id);
create index if not exists idx_admin_notifications_recipient_role
  on admin_notifications(recipient_role);
create index if not exists idx_admin_notifications_recipient_user
  on admin_notifications(recipient_user_id);
create index if not exists idx_admin_notifications_created_desc
  on admin_notifications(created_at desc);

alter table admin_notifications enable row level security;

-- No browser/customer policy is intentionally added. All access goes through
-- server-side internal-admin APIs backed by the Supabase service-role client.
