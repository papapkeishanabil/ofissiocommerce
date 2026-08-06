# Ginee Omnichannel Integration

Task G1 menambahkan konektor Ginee **read-only**. Ginee berperan sebagai jembatan omnichannel untuk membaca channel, order marketplace, dan inventory. Ofissio tetap menjadi source of truth untuk quotation, order B2B custom, payment, serta proses produksi.

## Arsitektur

```text
Ginee Open API
  -> signed server request
  -> Ginee provider (mock/live read-only)
  -> mapper + SKU matching
  -> sanitized snapshot / report admin

Ginee webhook
  -> shared-secret guard
  -> idempotency key
  -> sanitized event (pending_refetch)
  -> detail order harus dibaca ulang dari Ginee
```

Access key, secret key, signature, dan webhook secret tidak pernah dikirim ke browser. Semua admin API menggunakan Supabase Auth/internal RBAC. Tabel integrasi hanya dapat diakses service role dan menggunakan forced RLS.

## Aturan SKU

- Parent SKU adalah kode model, misalnya `KK-006`.
- Stock SKU adalah unit stok per ukuran, misalnya `KK-006-S`, `KK-006-M`, `KK-006-L`.
- Jika kelak ada warna, bentuknya dapat menjadi `KK-006-NAVY-M`.
- Stock SKU adalah matching key utama antara Ofissio, WooCommerce, dan Ginee.
- Ginee/WooCommerce IDs tetap disimpan sebagai referensi, bukan business key utama.

Mapping dikelola dari `/admin/integrations/ginee`. Menyimpan mapping tidak mengirim atau mengubah data di Ginee.

## Konfigurasi

Salin blok Ginee dari `.env.example` ke `.env.local`. Minimal untuk live read-only:

```dotenv
GINEE_ENABLED=true
GINEE_MODE=sandbox
GINEE_BASE_URL=https://api.ginee.com
GINEE_COUNTRY=ID
GINEE_ACCESS_KEY=...
GINEE_SECRET_KEY=...
GINEE_TEST_LIVE=true
GINEE_SYNC_ORDERS=false
GINEE_SYNC_INVENTORY=false
```

Dapatkan access key dan secret melalui portal/integrator Ginee yang berwenang. Jangan menyalinnya ke `NEXT_PUBLIC_*`, source code, dokumentasi, screenshot, atau Git.

`GINEE_TEST_LIVE=false` memakai provider mock dan tidak memanggil API nyata. Set `true` hanya saat sengaja melakukan smoke test read-only. Untuk endpoint sandbox khusus dari Ginee, override `GINEE_BASE_URL` sesuai credential yang diberikan Ginee.

Dokumentasi vendor:

- [Getting started dan signature](https://doc.ginee.com/_get_started.html)
- [List order v2](https://doc.ginee.com/api/order/_list_order_v2.html)
- [Order detail v2](https://doc.ginee.com/api/order/_get_order_detail_V2.html)
- [Master product list](https://doc.ginee.com/api/product/_list_master_product.html)
- [Warehouse inventory](https://doc.ginee.com/api/warehouseInventory/_list_warehouse_inventory.html)

## Database

Jalankan `database/migrations/021_ginee_readonly_integration.sql` secara manual setelah migration 020. Migration membuat:

- `ginee_product_mappings`
- `ginee_order_snapshots`
- `ginee_webhook_events`

Snapshot dan webhook payload disanitasi; nama/alamat customer dan raw payload sensitif tidak disimpan oleh foundation ini. Kedua flag write dikunci `false` melalui constraint database.

## Webhook

Endpoint: `POST /api/integrations/ginee/webhook`.

Set `GINEE_WEBHOOK_SECRET` dan kirim salah satu header yang didukung:

```text
x-ofissio-ginee-webhook-secret: <shared-secret>
```

Webhook duplicate menghasilkan respons sukses idempotent. Event order diberi status `pending_refetch`; payload webhook tidak langsung dipercaya sebagai source of truth.

## Validasi

```bash
npm run check:env
npm run check:ginee
npm run check:auth
```

`check:ginee` menguji signer dummy, mock shop/order/inventory, mapping S/M/L, webhook valid/duplicate/invalid, RBAC, client secret scan, serta memastikan tidak ada endpoint destructive.

## Batasan, next phase, dan rollback

- G1 tidak mengimpor order menjadi order Ofissio.
- G1 tidak accept/cancel/ship order dan tidak update inventory Ginee/WooCommerce.
- G2 dapat menambahkan order import dengan deduplikasi dan approval operasional.
- G3 dapat menambahkan inventory sync setelah aturan ownership, conflict resolution, dan audit disetujui.

Rollback aman: set `GINEE_ENABLED=false` dan `GINEE_TEST_LIVE=false`, restart aplikasi, lalu gunakan provider mock. Jangan menghapus tabel/snapshot saat incident karena diperlukan untuk audit.
