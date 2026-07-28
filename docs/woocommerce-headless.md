# WooCommerce Headless Integration

Phase 8 menjadikan WooCommerce sebagai kandidat master catalog dan order backend, sementara customer tetap memakai UI custom Ofissio.

## Prinsip

- Customer tidak melihat theme WordPress/WooCommerce.
- Katalog, product detail, 3D configurator, cart, checkout, tracking, dan Ofistant tetap memakai UI Ofissio.
- UI tidak membaca WooCommerce langsung.
- Secret WooCommerce hanya dibaca server-side.
- Default tetap mock agar KK-006 dan Phase 1-7 tetap aman.

## Mode mock

```env
PRODUCT_SOURCE=mock
WOOCOMMERCE_ENABLED=false
WOOCOMMERCE_SYNC_ORDERS=false
```

Mode ini memakai mock product repository. Produk published wajib punya GLB valid, sehingga KK-006 tetap tampil memakai `/3d/kk-006.glb`.

## Mode WooCommerce

```env
PRODUCT_SOURCE=woocommerce
WOOCOMMERCE_ENABLED=true
WOOCOMMERCE_BASE_URL=https://your-wordpress-site.com
WOOCOMMERCE_CONSUMER_KEY=
WOOCOMMERCE_CONSUMER_SECRET=
WOOCOMMERCE_SYNC_ORDERS=false
```

Jika env tidak lengkap, Ofissio fallback aman ke mock. Jika WooCommerce down saat server fetch, Ofissio juga fallback aman dan mencatat audit log.

## Order sync foundation

Order sync tidak aktif default.

```env
WOOCOMMERCE_SYNC_ORDERS=true
```

Jika aktif, checkout Ofissio tetap membuat internal/mock payment order lebih dulu, lalu mencoba membuat order WooCommerce dengan metadata Ofissio. Jika sync gagal, payment mock dan tracking Ofissio tidak dihancurkan.

## Security

- Jangan pakai `NEXT_PUBLIC_WOOCOMMERCE_CONSUMER_SECRET`.
- Jangan log consumer key/secret.
- CSP sudah mengizinkan `connect-src https:`. Jika GLB WooCommerce di domain eksternal tertentu gagal karena CSP/CORS, izinkan domain spesifik, bukan wildcard longgar.

## Known limitation

- Product source WooCommerce tersedia sebagai server-side foundation.
- Auth, payment, shipping, dan database production belum diganti.
- Validasi GLB Phase 8 hanya metadata/extension, belum download binary remote GLB.
