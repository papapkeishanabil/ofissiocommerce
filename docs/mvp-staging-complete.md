# MVP staging complete

Tanggal checkpoint: 30 Juli 2026.

Status MVP staging: **complete untuk foundation staging**.

Checkpoint ini menutup rangkaian Phase 4C sampai Phase 24 sebagai staging-ready foundation. Aplikasi sudah bisa diuji end-to-end dengan Supabase live untuk database/storage, dokumen PDF, payment mock, process order, dan shipment manual.

## Scope yang sudah tervalidasi

- Product catalog mode mock tetap menampilkan KK-006.
- Detail produk KK-006 terbuka dan `/3d/kk-006.glb` 200.
- Preview 3D dan konfigurasi bordir tetap membuka canvas.
- Customer upload logo tersimpan di Supabase Storage dan metadata tersimpan di `uploaded_files` / `company_logos`.
- Cart menerima KK-006 dengan placement logo.
- Quotation dibuat, dipricing admin, dikirim mock email, diterima customer, lalu dikonversi menjadi order.
- PDF quotation dan invoice bisa dibuat dan diakses via signed URL company-scoped.
- Payment mock membuat payment link, status `paid`, event payment, dan tracking.
- Process order dibuat sesuai route `customization`, idempotent, memiliki item/task/event, dan progress berubah setelah task complete.
- Shipment manual dibuat, resi tersimpan, status sampai `delivered`, event shipment tercatat, dan customer tracking ikut update.
- Admin layout isolated dari UI customer.
- Mobile smoke tidak menemukan horizontal overflow pada route utama.

## Latest Phase 25 live smoke IDs

- Run: `PHASE25_20260730161749`
- Quotation: `quo_99c0ee0a-7673-4efb-8381-a18f4f2fbbb0`
- Order: `ord_6f8b6aa1-212c-4da9-8f8f-f34f53c2c317`
- Payment: `pay_77d726d9-7743-4013-aa98-f760f96344ce`
- Process order: `pro_b5f40043-6470-4a1f-800d-b8c92f545790`
- Shipment: `shp_a04abf7e-dc06-4780-9a30-9f9dd3778dd6`
- Tracking number: `PHASE25_20260730161749-RESI-001`

## Important staging defaults

- `DATABASE_PROVIDER=supabase`
- `STORAGE_PROVIDER=supabase`
- `AUTH_PROVIDER=mock`
- `EMAIL_PROVIDER=mock`
- `PAYMENT_PROVIDER=mock`
- WooCommerce live env belum aktif.
- Shipping provider API real belum aktif.

## Tidak termasuk production-ready

MVP staging complete bukan berarti production launch ready. Production masih membutuhkan real auth, iPaymu live/sandbox verification, Resend sender domain verification, WooCommerce staging/live credentials, shipping provider integration, monitoring, backup restore drill, dan legal/policy pages. Lihat [production-gap.md](./production-gap.md).

