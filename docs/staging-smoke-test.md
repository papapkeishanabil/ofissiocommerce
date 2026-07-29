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

## Security smoke

- [ ] Secret tidak muncul di client bundle.
- [ ] API invalid request memberi safe response.
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
