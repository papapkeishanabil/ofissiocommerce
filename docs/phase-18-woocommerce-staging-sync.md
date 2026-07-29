# Phase 18: WooCommerce Staging Product & Order Sync Foundation

## Status implementasi

Phase 18 menambahkan fondasi WooCommerce staging tanpa mengubah KK-006 atau `/3d/kk-006.glb`.

Yang sudah aktif:

- Produk WooCommerce tetap difilter: published, SKU ada, metadata GLB lengkap, dan jika bordir aktif maka zones wajib ada.
- Cart tetap menolak produk tanpa GLB valid.
- Produk standar tidak diblokir customer UI oleh status stok WooCommerce.
- Direct checkout membuat order Ofissio lalu mencoba Woo order sync jika env aktif.
- Convert quotation to order membuat order Ofissio/tracking lalu mencoba Woo order sync jika env aktif.
- Sync failure tidak membatalkan order Ofissio.
- Ofissio Admin menentukan `process_route`: fulfillment, customization, atau production.
- Admin order tidak otomatis membuat Production Order untuk semua order.
- Admin order/quotation detail menampilkan panel Woo sync.
- Admin retry endpoint tersedia.
- `npm run check:woocommerce` tersedia dan skip aman jika env Woo belum lengkap.
- Migration 004 tersedia untuk kolom/reporting Woo sync.

## File penting

- `src/features/orders/woocommerce-order-sync.service.ts`
- `src/features/orders/order-routing.service.ts`
- `src/features/orders/order.mapper.ts`
- `src/features/admin/components/AdminOrderProcessPanel.tsx`
- `src/app/api/admin/orders/[id]/sync-woocommerce/route.ts`
- `src/app/api/admin/orders/[id]/process/route.ts`
- `src/app/api/admin/quotations/[id]/sync-woocommerce/route.ts`
- `src/app/api/admin/woocommerce/status/route.ts`
- `database/migrations/004_woocommerce_sync.sql`
- `scripts/check-woocommerce.ts`

## Cara test mode mock

```bash
npm run check:env
npm run check:woocommerce
npm run typecheck
npm run lint
npm run build
```

Expected:

- `check:woocommerce` menampilkan `SKIP` jika env WooCommerce belum aktif.
- Catalog tetap memakai mock.
- KK-006 tetap bisa dibuka.
- Preview 3D tetap membaca `/3d/kk-006.glb`.
- Cart/checkout mock tetap berjalan.

## Cara test mode WooCommerce staging

1. Isi env WooCommerce staging.
2. Pastikan REST key minimal read untuk product source.
3. Jalankan:

```bash
npm run check:woocommerce
```

4. Set `PRODUCT_SOURCE=woocommerce`.
5. Pastikan hanya produk published dengan metadata GLB valid yang tampil.
6. Produk tanpa GLB valid harus terfilter dari katalog/detail/cart.
7. Jika ingin uji order sync, set `WOOCOMMERCE_SYNC_ORDERS=true` dan gunakan REST key read/write staging.
8. Buat checkout mock atau convert quotation.
9. Buka `/admin/orders/[id]` dan cek panel WooCommerce sync.

## Known limitation

- WooCommerce write test otomatis belum dibuat agar tidak membuat order staging tanpa izin eksplisit.
- Detail module Fulfillment/Customization/Production Order penuh belum dibuat; Phase 18 hanya status/route foundation.
- PDF quotation final belum masuk scope.
- iPaymu live, shipping real, dan Woo webhook balik ke Ofissio belum masuk scope Phase 18.
