-- Add a dedicated admin notification for new quotation/full-custom requests.
-- Run manually in the Supabase SQL Editor for staging/dev.

alter table admin_notifications
  drop constraint if exists admin_notifications_type_check;

alter table admin_notifications
  add constraint admin_notifications_type_check
  check (type in (
    'order_created', 'quotation_requested', 'quotation_accepted',
    'payment_paid', 'shipment_created', 'system_warning'
  ));

-- Backfill outstanding requests so submissions created before this patch,
-- including the latest Full Custom request, are not missed by the admin team.
insert into admin_notifications (
  id,
  type,
  title,
  message,
  entity_type,
  entity_id,
  entity_number,
  severity,
  status,
  metadata,
  email_status,
  created_at,
  updated_at
)
select
  'ant_' || gen_random_uuid()::text,
  'quotation_requested',
  case
    when q.source = 'custom_request' then 'Permintaan Full Custom Baru'
    else 'Permintaan Quotation Baru'
  end,
  coalesce(nullif(q.pic_name, ''), 'Customer Ofissio') || ' dari ' ||
    coalesce(nullif(q.company_name, ''), q.company_id) || ' mengajukan ' ||
    q.quotation_number || ' untuk ' || q.total_qty::text || ' pcs.',
  'quotation',
  q.id,
  q.quotation_number,
  'info',
  'unread',
  jsonb_build_object(
    'quotationId', q.id,
    'quotationNumber', q.quotation_number,
    'customerName', coalesce(nullif(q.pic_name, ''), 'Customer Ofissio'),
    'companyName', coalesce(nullif(q.company_name, ''), q.company_id),
    'totalQty', q.total_qty,
    'productSummary', case
      when q.source = 'custom_request' then 'Proyek seragam Full Custom'
      else 'Permintaan quotation produk Ofissio'
    end,
    'requestedProcessRoute', coalesce(
      q.quotation_json ->> 'requestedProcessRoute',
      case when q.source = 'custom_request' then 'production' else 'fulfillment' end
    ),
    'adminUrl', '/admin/quotations/' || q.id,
    'source', q.source
  ),
  'not_required',
  q.created_at,
  now()
from quotations q
where q.source = 'custom_request'
  and q.status in ('submitted', 'under_review')
  and not exists (
    select 1
    from admin_notifications n
    where n.type = 'quotation_requested'
      and n.entity_type = 'quotation'
      and n.entity_id = q.id
  );
