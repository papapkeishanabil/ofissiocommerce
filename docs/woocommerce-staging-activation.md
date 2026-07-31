# WooCommerce staging activation

Tanggal update: 31 Juli 2026.

Dokumen ini adalah checklist manual untuk mengaktifkan WooCommerce staging sebagai product catalog dan order sync foundation Ofissio. Jangan gunakan credential production pada tahap ini.

## 1. WordPress / WooCommerce precheck

- [ ] WordPress staging aktif dan terpisah dari production.
- [ ] WooCommerce plugin aktif.
- [ ] REST API WooCommerce aktif.
- [ ] REST API key dibuat khusus Ofissio.
- [ ] Permission API key minimal `Read` untuk product source.
- [ ] Permission API key `Read/Write` hanya jika order sync staging akan diuji.
- [ ] Produk test valid dibuat.
- [ ] Produk negative test tanpa GLB dibuat.
- [ ] Produk negative test tidak tampil di Ofissio.

## 2. Cara membuat REST API key

1. Masuk ke WP Admin staging.
2. Buka `WooCommerce > Settings > Advanced > REST API`.
3. Klik `Add key`.
4. Isi description, misalnya `Ofissio Staging`.
5. Pilih user admin staging yang aman.
6. Pilih permission:
   - `Read` untuk product source test awal.
   - `Read/Write` untuk order sync/write smoke.
7. Simpan `Consumer key` dan `Consumer secret` ke `.env.local` atau secret manager staging.

Jangan pernah menyimpan secret WooCommerce ke Git dan jangan membuat env `NEXT_PUBLIC_WOOCOMMERCE_CONSUMER_SECRET`.

## 3. Env staging

Awal test product source:

```bash
PRODUCT_SOURCE=woocommerce
WOOCOMMERCE_ENABLED=true
WOOCOMMERCE_BASE_URL=https://domain-woocommerce-staging-anda.com
WOOCOMMERCE_CONSUMER_KEY=ck_xxxxx
WOOCOMMERCE_CONSUMER_SECRET=cs_xxxxx
WOOCOMMERCE_SYNC_ORDERS=false
WOOCOMMERCE_TEST_WRITE=false
WOOCOMMERCE_ALLOW_SELF_SIGNED_TLS=false
```

Jika staging lokal memakai domain `.local` dengan self-signed certificate, checker dan server-side Woo client otomatis mengizinkan TLS self-signed selama bukan `NODE_ENV=production`. Untuk domain staging publik, gunakan sertifikat valid dan biarkan `WOOCOMMERCE_ALLOW_SELF_SIGNED_TLS=false`.

Setelah product source pass dan key punya permission write:

```bash
WOOCOMMERCE_SYNC_ORDERS=true
WOOCOMMERCE_TEST_WRITE=false
```

Aktifkan write smoke hanya jika benar-benar siap membuat order test di WooCommerce staging:

```bash
WOOCOMMERCE_TEST_WRITE=true
```

Write smoke memakai idempotency key harian. Jika perlu key eksplisit:

```bash
WOOCOMMERCE_TEST_ID=ofissio-check-manual-001
```

## 4. Meta field produk wajib

Produk WooCommerce hanya tampil di Ofissio jika semua syarat ini terpenuhi:

- status produk `publish`;
- SKU tidak kosong;
- harga dasar lebih dari 0;
- `has_3d_model=true`;
- `model_3d_url` berakhiran `.glb`;
- `model_3d_id` terisi;
- `model_3d_version` terisi;
- `model_3d_source` terisi;
- `model_3d_filename` berakhiran `.glb`;
- `moq` lebih dari 0;
- `lead_time` terisi;
- `fulfillment_type` bisa `READY_STOCK`, `ready_stock`, `ready-stock`, `READY_STOCK_WITH_CUSTOMIZATION`, `ready_stock_with_customization`, `ready-stock-with-customization`, `ready_stock_customization`, `MADE_TO_ORDER`, `made_to_order`, `made-to-order`, `QUOTATION_ONLY`, `quotation_only`, atau `quotation-only`;
- `transaction_mode` salah satu `DIRECT_CHECKOUT` / `REQUEST_QUOTATION` / `HYBRID`;
- `industries` terisi;
- jika `supports_embroidery=true`, maka `embroidery_zones` wajib terisi.

## 5. Produk tanpa GLB

Buat minimal satu produk negative test:

- published;
- SKU/harga ada;
- tetapi `has_3d_model=false` atau `model_3d_url` kosong/bukan `.glb`.

Ekspektasi:

- produk tidak tampil di `/catalog`;
- product detail tidak terbuka sebagai produk Ofissio valid;
- cart menolak produk tanpa GLB.

## 6. Aturan stok produk standar

Ofissio/Harmas tidak memakai konsep customer-facing `out of stock` untuk produk standar. Jika WooCommerce `stock_status=outofstock`, produk standar tetap boleh tampil selama meta Ofissio valid dan orderable. Kekurangan stok menjadi warning internal admin:

```text
Replenishment needed
```

Jangan tampilkan `stok habis` / `out of stock` ke customer untuk produk standar.

## 7. Cara test product source

1. Set `.env.local` ke `PRODUCT_SOURCE=woocommerce`.
2. Set `WOOCOMMERCE_ENABLED=true`.
3. Isi base URL dan key/secret staging.
4. Jalankan:

```bash
npm run check:woocommerce
```

Ekspektasi:

- output tidak mencetak consumer key/secret;
- products endpoint reachable;
- orders endpoint read reachable;
- jumlah produk valid GLB ditampilkan;
- produk invalid/missing GLB dihitung sebagai filtered.

Kemudian buka:

- `/catalog`;
- detail produk WooCommerce valid;
- modal `Preview 3D & Bordir Logo`;
- cart/quotation flow.

## 8. Cara test order sync

1. Pastikan product source WooCommerce sudah pass.
2. Set `WOOCOMMERCE_SYNC_ORDERS=true`.
3. Buat quotation sampai accepted dan convert ke order.
4. Buka `/admin/orders/[id]`.
5. Klik retry/sync WooCommerce jika belum otomatis.
6. Pastikan:
   - `woo_order_id` tersimpan di Supabase;
   - WooCommerce order punya meta `ofissio_order_id`;
   - retry kedua tidak membuat order duplikat;
   - jika gagal, order Ofissio tetap aman dan status sync menjadi `failed`/`pending`.

## 9. Rollback ke mock

Jika WooCommerce staging bermasalah:

```bash
PRODUCT_SOURCE=mock
WOOCOMMERCE_ENABLED=false
WOOCOMMERCE_SYNC_ORDERS=false
WOOCOMMERCE_TEST_WRITE=false
```

Lalu restart server dan jalankan:

```bash
npm run check:woocommerce
npm run check:all
```

KK-006 mock tetap memakai `/3d/kk-006.glb`.

## 10. Secret policy

- Jangan commit `.env.local`.
- Jangan commit real WooCommerce key/secret.
- Jangan set `NEXT_PUBLIC_WOOCOMMERCE_CONSUMER_SECRET`.
- WooCommerce client hanya boleh server-side.
- Raw WooCommerce error tidak boleh dibocorkan ke customer.
