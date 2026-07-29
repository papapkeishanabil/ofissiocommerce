# WooCommerce staging readiness

WooCommerce live belum dipaksa sampai env tersedia. Dokumen ini menjadi checklist staging saat WordPress/WooCommerce staging siap.

## Requirement WordPress/WooCommerce

- WordPress staging site terpisah dari production.
- WooCommerce aktif.
- REST API WooCommerce aktif.
- Ofissio Commerce Bridge skeleton/plugin aktif nanti jika custom field perlu dibantu.

## REST API key

1. Masuk WordPress admin staging.
2. Buka WooCommerce settings REST API.
3. Buat API key khusus Ofissio.
4. Permission minimal: read untuk product source; read/write hanya jika order sync staging akan diuji.
5. Simpan consumer key/secret di secret manager staging.

## Env

```bash
PRODUCT_SOURCE=woocommerce
WOOCOMMERCE_ENABLED=true
WOOCOMMERCE_BASE_URL=
WOOCOMMERCE_CONSUMER_KEY=
WOOCOMMERCE_CONSUMER_SECRET=
WOOCOMMERCE_SYNC_ORDERS=false
```

Jangan commit consumer key/secret dan jangan buat `NEXT_PUBLIC_WOOCOMMERCE_CONSUMER_SECRET`.

## Produk test wajib

- SKU wajib.
- Status published.
- GLB wajib.
- `has_3d_model=true`.
- `model_3d_url` wajib.
- `model_3d_id` wajib.
- `model_3d_version` wajib.
- `model_3d_filename` wajib.
- `model_3d_source` wajib.

Status stok WooCommerce tidak boleh menjadi blocker customer-facing untuk produk standar. Jika stok fisik kurang, perlakukan sebagai replenishment internal di Ofissio Admin.

## Test staging

- Produk tanpa GLB tidak tampil.
- Produk dengan GLB tampil.
- Produk standar tetap tampil walaupun stok WooCommerce tidak dipakai sebagai blocker UI.
- Detail produk terbuka.
- 3D configurator membaca `model_3d_url`.
- Cart menerima produk valid.
- Checkout mock tetap berjalan.

## Order sync

Order sync masih default off:

```bash
WOOCOMMERCE_SYNC_ORDERS=false
```

Aktifkan `WOOCOMMERCE_SYNC_ORDERS=true` hanya di staging setelah product source pass dan permission write memang disiapkan.

Order sync membuat Sales/Commerce Order. Process route internal ditentukan di Ofissio Admin:

- fulfillment
- customization
- production

## Phase 18 readiness commands

```bash
npm run check:woocommerce
```

Hasil yang valid:

- `SKIP` jika WooCommerce env belum diisi.
- `OK` jika `/products` reachable.
- Jika `PRODUCT_SOURCE=woocommerce`, minimal ada satu produk published dengan metadata GLB valid.
- Jika `WOOCOMMERCE_SYNC_ORDERS=true`, `/orders` harus reachable dengan credential staging.

Write test otomatis sengaja tidak dilakukan agar tidak membuat order staging tanpa persetujuan eksplisit.
