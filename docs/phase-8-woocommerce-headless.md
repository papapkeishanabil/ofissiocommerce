# Phase 8: WooCommerce Headless Product Source & Order Sync Foundation

## Status

Phase 8 foundation dibuat dengan default aman:

- `PRODUCT_SOURCE=mock`
- `WOOCOMMERCE_ENABLED=false`
- `WOOCOMMERCE_SYNC_ORDERS=false`

## Implementasi utama

- WooCommerce client server-side.
- WooCommerce product repository.
- WooCommerce to Ofissio product mapper.
- Product server service dengan source switching mock/WooCommerce.
- Cart/checkout backend tetap validasi ulang dari canonical product service.
- Order sync foundation ke WooCommerce.
- Payment status sync foundation ke WooCommerce.
- Dokumentasi product fields dan plugin bridge.
- Skeleton plugin WordPress ringan.

## Cara memilih mock

```env
PRODUCT_SOURCE=mock
WOOCOMMERCE_ENABLED=false
WOOCOMMERCE_SYNC_ORDERS=false
```

## Cara memilih WooCommerce

```env
PRODUCT_SOURCE=woocommerce
WOOCOMMERCE_ENABLED=true
WOOCOMMERCE_BASE_URL=https://your-wordpress-site.com
WOOCOMMERCE_CONSUMER_KEY=
WOOCOMMERCE_CONSUMER_SECRET=
WOOCOMMERCE_SYNC_ORDERS=false
```

## Env WooCommerce

- `PRODUCT_SOURCE`
- `WOOCOMMERCE_ENABLED`
- `WOOCOMMERCE_BASE_URL`
- `WOOCOMMERCE_CONSUMER_KEY`
- `WOOCOMMERCE_CONSUMER_SECRET`
- `WOOCOMMERCE_SYNC_ORDERS`

## Mapping WooCommerce ke Ofissio

Mapper membaca:

- field standar WooCommerce: `id`, `name`, `slug`, `sku`, `description`, `short_description`, `categories`, `attributes`, `price`, `regular_price`, `sale_price`, `stock_status`, `status`
- custom meta Ofissio: `model_3d_url`, `model_3d_id`, `model_3d_version`, `model_3d_source`, `model_3d_filename`, `has_3d_model`, `moq`, `lead_time`, `fulfillment_type`, `transaction_mode`, `industries`, `available_colors`, `available_sizes`, `supports_embroidery`, `embroidery_zones`, `camera_presets`

## Aturan wajib GLB

Produk WooCommerce hanya tampil jika:

1. status `publish`
2. SKU ada
3. `has_3d_model=true`
4. `model_3d_url` berakhiran `.glb`
5. `model_3d_id` ada
6. `model_3d_version` ada
7. `model_3d_filename` berakhiran `.glb`
8. `model_3d_source` ada
9. lolos `validateProductForCatalog()`
10. jika `supports_embroidery=true`, `embroidery_zones` wajib ada

## Test mode mock

1. Set env mock.
2. Jalankan `npm run dev`.
3. Buka `/catalog`.
4. Pastikan KK-006 tampil.
5. Buka detail KK-006.
6. Buka `Preview 3D & Bordir Logo`.
7. Add to cart.
8. Checkout.
9. Payment mock success.
10. Pastikan dashboard/tracking tetap berjalan.

## Test mode WooCommerce

1. Isi env WooCommerce.
2. Set `PRODUCT_SOURCE=woocommerce`.
3. Set `WOOCOMMERCE_ENABLED=true`.
4. Jalankan server.
5. Buka `/catalog`.
6. Pastikan hanya produk WooCommerce valid dengan GLB yang tampil.
7. Pastikan produk tanpa GLB tidak tampil.
8. Add to cart dan checkout mock.
9. Jika `WOOCOMMERCE_SYNC_ORDERS=true`, cek order WooCommerce.

## Test secret tidak bocor

- Cari `WOOCOMMERCE_CONSUMER_SECRET` di browser bundle.
- Pastikan tidak ada `NEXT_PUBLIC_WOOCOMMERCE_CONSUMER_SECRET`.
- Pastikan error WooCommerce ke customer tetap generic.

## Known limitation

- Order sync WooCommerce masih foundation.
- Payment tetap mock/iPaymu foundation, belum live iPaymu.
- Shipping tetap mock/manual.
- Auth masih mock.
- Database production belum ada.
- Bridge plugin belum penuh.
- Remote GLB belum divalidasi binary, hanya metadata dan extension.

## Aman lanjut Phase 9?

Aman lanjut Phase 9 setelah checkpoint manual mock dan optional WooCommerce env test dilakukan.
