# Staging smoke test

Jalankan checklist ini setiap deploy staging.

## Customer flow

- [ ] Buka homepage.
- [ ] Buka `/catalog`.
- [ ] Buka `/product/kemeja-kantor-kk-006`.
- [ ] Pastikan `/3d/kk-006.glb` 200.
- [ ] Preview 3D membuka canvas.
- [ ] Add to cart.
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

## Conditional staging integrations

- [ ] WooCommerce staging test jika env tersedia.
- [ ] Email test jika Resend tersedia.
- [ ] iPaymu sandbox test hanya setelah signature resmi diimplementasikan.
- [ ] Shipping provider sandbox test hanya setelah provider real dipilih.
