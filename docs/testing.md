# Final testing checklist

Gunakan checklist ini sebelum staging deploy dan ulangi sebelum production launch.

## Automated checks

```bash
npm run typecheck
npm run lint
npm run build
```

Jika nanti ada test runner:

```bash
npm run test
```

## Customer flow

- Buka `/catalog`.
- Pastikan hanya produk published dengan GLB valid yang tampil.
- Buka detail KK-006.
- Pastikan `/3d/kk-006.glb` 200.
- Buka Preview 3D & Bordir Logo.
- Pastikan canvas 3D tampil.
- Upload logo jika fitur tersedia.
- Pilih titik bordir.
- Isi size matrix minimal MOQ.
- Add to cart.
- Cart menyimpan SKU.
- Cart menyimpan `model3dId`.
- Cart menyimpan `model3dUrl`.
- Checkout.
- Cek ongkir.
- Pilih shipping mock/manual.
- Lanjut pembayaran.
- Mock payment success.
- Payment status menjadi `paid`.
- Order status menjadi `payment_received`.
- Tracking record dibuat.
- Dashboard menampilkan order.
- Buka `/orders/[id]`.
- Tracking menampilkan status, shipping rate, size matrix, embroidery placement, dan `model3dUrl`.
- Repeat order.
- Ofistant: “Pesanan saya sudah sampai mana?”
- Mobile responsive.
- Browser console tidak menampilkan error runtime.

## Security flow

- Invalid payment ID memberi safe response.
- Company mismatch payment ditolak.
- Company mismatch tracking tidak bocor.
- Invalid shipping request ditolak aman.
- Secret tidak muncul di client bundle.
- Error response tidak menampilkan stack trace.
- Produk tanpa GLB tidak tampil.
- Produk tanpa GLB tidak bisa masuk cart.
- Ofistant tidak membuka order company lain.
- Mock payment completion idempotent.

## WooCommerce flow

WooCommerce live test belum dipaksa karena env belum tersedia.

Saat env tersedia di staging, test:

- `PRODUCT_SOURCE=woocommerce`.
- `WOOCOMMERCE_ENABLED=true`.
- `WOOCOMMERCE_BASE_URL` terisi.
- `WOOCOMMERCE_CONSUMER_KEY` terisi.
- `WOOCOMMERCE_CONSUMER_SECRET` terisi.
- Katalog hanya menampilkan produk WooCommerce published dengan GLB valid.
- Produk WooCommerce tanpa GLB tidak tampil.
- Detail produk WooCommerce valid terbuka.
- 3D configurator membaca `model_3d_url`.
- Cart menerima produk valid.
- Checkout mock tetap berjalan.
- Jika `WOOCOMMERCE_SYNC_ORDERS=true`, order sync foundation berjalan.

## Responsive/mobile

- Tidak ada horizontal overflow.
- Product detail tetap bisa scroll normal.
- Smart floating preview berubah menjadi bottom mini bar.
- Bottom mini bar tidak menutup CTA penting secara permanen.
- Modal preview bisa ditutup dengan ESC dan tombol close.

## 3D/performance

- 3D configurator lazy-loaded.
- Floating preview memakai thumbnail/snapshot, bukan render 3D aktif.
- GLB tidak dimuat berulang tanpa perlu.
- Upload logo object URL dibersihkan ketika diganti/dihapus.
- Error GLB tampil ramah.
