-- Ofissio Phase 11 development seed.
-- Non-production demo data only. No real password or secret.

insert into companies (
  id,
  name,
  legal_name,
  industry,
  employee_count,
  status
) values (
  '00000000-0000-0000-0000-000000000001',
  'Ofissio Demo Company',
  'PT Ofissio Demo Indonesia',
  'Corporate',
  50,
  'active'
) on conflict (id) do nothing;

insert into user_profiles (
  id,
  auth_user_id,
  name,
  email,
  whatsapp,
  status
) values (
  '00000000-0000-0000-0000-000000000101',
  null,
  'Demo Buyer',
  'demo@ofissio.test',
  '081234567890',
  'active'
) on conflict (email) do nothing;

insert into company_users (
  company_id,
  user_id,
  role,
  status
) values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000101',
  'company_admin',
  'active'
) on conflict (company_id, user_id) do nothing;

insert into company_addresses (
  id,
  company_id,
  label,
  recipient_name,
  phone,
  address_line,
  city,
  province,
  postal_code,
  is_default
) values (
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000001',
  'Kantor Bandung',
  'Demo Buyer',
  '081234567890',
  'Jl. Demo Ofissio No. 11',
  'Bandung',
  'Jawa Barat',
  '40115',
  true
) on conflict (id) do nothing;

insert into orders (
  id,
  order_number,
  company_id,
  user_id,
  status,
  payment_status,
  fulfillment_type,
  transaction_mode,
  subtotal,
  shipping_total,
  tax_total,
  grand_total,
  selected_shipping_rate_json
) values (
  '00000000-0000-0000-0000-000000000301',
  'OF-DEMO-0001',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000101',
  'payment_received',
  'paid',
  'MADE_TO_ORDER',
  'HYBRID',
  2700000,
  25000,
  297000,
  3022000,
  '{"provider":"mock","courierName":"JNE","serviceName":"Regular"}'::jsonb
) on conflict (order_number) do nothing;

insert into tracking_records (
  order_id,
  company_id,
  status,
  current_status,
  next_step,
  progress,
  timeline_json
) values (
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000001',
  'payment_received',
  'Pembayaran diterima',
  'Persiapan produksi',
  15,
  '[{"id":"payment_received","label":"Pembayaran diterima","state":"completed"}]'::jsonb
) on conflict (order_id) do nothing;
