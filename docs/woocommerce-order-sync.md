# WooCommerce Order Sync Foundation

Phase 18 menyiapkan sinkronisasi order Ofissio ke WooCommerce staging. Fitur ini aman untuk mode mock: jika env WooCommerce belum lengkap atau sync dimatikan, order Ofissio tetap dibuat dan status sync menjadi `disabled`.

WooCommerce tetap diposisikan sebagai Sales Order / Commerce Order source. Ofissio Admin menentukan process route internal setelah order masuk; tidak semua order dibuat Production Order.

## Kapan sync berjalan

Sync order dijalankan pada:

- direct checkout/payment foundation setelah order Ofissio dibuat;
- convert quotation to order setelah order/tracking Ofissio dibuat;
- retry manual dari Ofissio Admin order detail;
- retry manual dari Ofissio Admin quotation detail jika quotation sudah converted.

Sync bersifat idempotent. Jika `wooOrderId` / `woocommerceOrderId` sudah ada di order, retry tidak membuat order WooCommerce baru.

## Env

```bash
WOOCOMMERCE_ENABLED=true
WOOCOMMERCE_BASE_URL=https://staging-wordpress.example.com
WOOCOMMERCE_CONSUMER_KEY=
WOOCOMMERCE_CONSUMER_SECRET=
WOOCOMMERCE_SYNC_ORDERS=true
WOOCOMMERCE_TEST_WRITE=false
```

`WOOCOMMERCE_CONSUMER_SECRET` wajib server-side. Jangan pernah membuat `NEXT_PUBLIC_WOOCOMMERCE_CONSUMER_SECRET`.

## Data yang dikirim ke WooCommerce

Order WooCommerce menerima:

- status `pending` untuk unpaid dan `processing` untuk paid;
- customer note berisi ringkasan order Ofissio;
- billing company/name/phone jika tersedia;
- line item produk, SKU, quantity, subtotal/total;
- selected color;
- size matrix JSON;
- embroidery placements JSON;
- logo file ids dan logo file names;
- model 3D id/url;
- `ofissio_order_id`;
- `ofissio_order_number`;
- `quotation_id` jika order berasal dari quotation;
- `source=ofissio`;
- payment provider dan payment reference;
- fulfillment type dan transaction mode.
- process route, process status, replenishment status, dan customization type.

Payload tidak berisi secret/API key.

## Process routing

Setelah sales/commerce order dibuat, Ofissio menentukan:

- `fulfillment` untuk produk standar tanpa custom;
- `customization` untuk produk standar dengan bordir/sablon/nama/custom ringan;
- `production` untuk custom design/model khusus/bahan khusus/desain khusus.

Admin detail order menampilkan tombol sesuai route:

- “Buat Fulfillment Order”
- “Buat Customization Order”
- “Buat Production Order”

Phase 18 belum membuat modul Production Order penuh. Button hanya foundation untuk memulai proses dan mengubah status operasional.

## Status sync

Status yang dipakai:

- `disabled`: Woo sync off/env belum lengkap.
- `pending`: sync sedang/akan dicoba.
- `synced`: order/status berhasil tersinkron.
- `failed`: sync gagal, order Ofissio tetap tersimpan.

Canonical sync state disimpan di `orders.order_json` dan `quotations.quotation_json`. Migration 004 menambahkan kolom fisik dan `woo_sync_logs` untuk reporting staging/production.

## Migration manual

Jalankan hanya saat staging siap:

```text
database/migrations/004_woocommerce_sync.sql
```

Jangan jalankan otomatis dari Codex. `company_id` sengaja bertipe `text` agar kompatibel dengan company id Ofissio yang masih mock/text.

## Admin retry

Route:

- `POST /api/admin/orders/[id]/sync-woocommerce`
- `POST /api/admin/quotations/[id]/sync-woocommerce`
- `GET /api/admin/woocommerce/status`

Semua route memakai internal admin guard, rate limit, audit log, dan safe error response. Customer tidak boleh memanggil route sync WooCommerce.

## Write smoke staging

`npm run check:woocommerce` selalu menguji `/products` dan `/orders` read saat env lengkap. Script tidak membuat order kecuali:

```bash
WOOCOMMERCE_TEST_WRITE=true
```

Write smoke memakai idempotency key:

- default: `ofissio-check-{host}-{YYYY-MM-DD}`;
- override: `WOOCOMMERCE_TEST_ID`.

Order smoke diberi meta:

- `source=ofissio`
- `ofissio_test=true`
- `ofissio_test_id`
- `ofissio_order_id`

Jalankan write smoke hanya di WooCommerce staging sandbox, bukan production.

## Known limitation

- Belum ada webhook WooCommerce balik ke Ofissio.
- Write test tetap opt-in eksplisit via `WOOCOMMERCE_TEST_WRITE=true`.
- WooCommerce order number berasal dari response Woo; jika response tidak memberi `number`, Ofissio menyimpan `id`.
- `woo_sync_logs` baru aktif setelah migration 004 dijalankan manual.

## Task A7 write smoke — 1 Agustus 2026

Write smoke local/staging menggunakan Ofissio order `OF-QUO-96202DA4-DD33FA` (`ord_3bbdfcdf-ce92-4a08-943d-c7ff589f1ff3`) hasil convert quotation A6.

- Order masih `waiting_payment`, sehingga WooCommerce order `#28` dibuat dengan status `pending`.
- Total Ofissio dan WooCommerce sama: Rp15.850.000.
- Woo meta menyimpan `source=ofissio`, `ofissio_order_id`, `ofissio_order_number`, dan `quotation_id`.
- Order dan line meta menyimpan tier `100-299 pcs`, final unit price Rp138.000, embroidery total Rp2.050.000, zona `left_chest`/`center_back`, serta line breakdown bordir.
- Supabase order menyimpan `woo_order_id=28`, status `synced`, timestamp sync, dan tidak memiliki sync error.
- `woo_sync_logs` memiliki satu record `ofissio_to_woocommerce/create_order/synced`.
- Retry API dan retry melalui admin UI memakai Woo order `#28`; hanya satu order memiliki `ofissio_order_id` tersebut.
- Anonymous, customer, dan internal role tanpa `admin:order:update` menerima 403.

Regression status payment tersedia melalui `npm run test:woocommerce-order-sync`: unpaid/waiting payment dipetakan ke `pending`, sedangkan paid dipetakan ke `processing`.

Flag `WOOCOMMERCE_TEST_WRITE=true` hanya untuk local/staging smoke. Kembalikan ke `false` sebelum konfigurasi production.
