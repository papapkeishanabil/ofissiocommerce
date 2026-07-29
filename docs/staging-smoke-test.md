# Staging smoke test

Jalankan checklist ini setiap deploy staging.

## Customer flow

- [ ] Buka homepage.
- [ ] Buka `/catalog`.
- [ ] Buka `/product/kemeja-kantor-kk-006`.
- [ ] Pastikan `/3d/kk-006.glb` 200.
- [ ] Preview 3D membuka canvas.
- [ ] Upload logo valid via Studio Bordir atau dashboard.
- [ ] Upload file invalid ditolak dengan safe response.
- [ ] Add to cart.
- [ ] Jika logo dipakai, cart menyimpan `logoFileId`.
- [ ] Checkout.
- [ ] Shipping mock/manual.
- [ ] Payment mock success.
- [ ] Dashboard.
- [ ] Tracking order.
- [ ] Ofistant tracking.
- [ ] Repeat order.
- [ ] Mobile responsive.
- [ ] Console browser 0 error.

## Ofissio Admin flow

- [ ] Buka `/admin`.
- [ ] Buka `/admin/quotations`.
- [ ] Buka `/admin/quotations/[id]` untuk quotation Supabase.
- [ ] Detail quotation menampilkan size matrix, logo file id, embroidery placements, `model3dId`, dan `model3dUrl`.
- [ ] Update status quotation foundation via admin.
- [ ] Buka `/admin/orders`.
- [ ] Buka `/admin/uploads`.
- [ ] Buka `/admin/tracking`.
- [ ] Buka `/admin/customers`.
- [ ] Buka `/admin/audit`.
- [ ] Mobile admin tidak horizontal overflow.
- [ ] Browser console admin 0 error.

## Phase 17 quotation management flow

- [ ] Jalankan manual migration `database/migrations/003_quotation_management.sql` di staging jika ingin mengaktifkan tabel `quotation_events`.
- [ ] Buat quotation dari customer flow.
- [ ] Admin buka `/admin/quotations/[id]`.
- [ ] Admin mark `under_review`.
- [ ] Admin update pricing.
- [ ] Admin mark `quoted`.
- [ ] Customer buka `/quotes/[id]` dan melihat harga final.
- [ ] Customer accept quotation.
- [ ] Admin convert quotation to order.
- [ ] Convert kedua kali idempotent.
- [ ] Order muncul di `/admin/orders`.
- [ ] Order muncul di customer dashboard dan `/orders/[id]`.
- [ ] Internal notes tidak tampil di response customer.
- [ ] Customer company lain tidak bisa baca quotation.

## Security smoke

- [ ] Secret tidak muncul di client bundle.
- [ ] API invalid request memberi safe response.
- [ ] Admin API butuh internal guard.
- [ ] Admin endpoint tidak expose secret/raw provider error.
- [ ] Produk tanpa GLB tidak tampil.
- [ ] Produk tanpa GLB tidak bisa masuk cart.
- [ ] Company mismatch tracking/payment ditolak.
- [ ] Company mismatch file detail/signed-url/delete ditolak.
- [ ] Company mismatch quotation list/detail ditolak.
- [ ] Storage secret tidak muncul di client bundle.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` tidak muncul di client bundle.

## Conditional staging integrations

- [ ] WooCommerce staging test jika env tersedia.
- [ ] Email test jika Resend tersedia.
- [ ] Supabase database test jika env tersedia: health connected, quotation/email log/upload metadata/company logo tersimpan.
- [ ] Supabase Storage test jika env tersedia.
- [ ] iPaymu sandbox test hanya setelah signature resmi diimplementasikan.
- [ ] Shipping provider sandbox test hanya setelah provider real dipilih.
