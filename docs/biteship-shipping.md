# Biteship shipping integration

Task E menempatkan Biteship sebagai carrier provider langsung untuk Ofissio. WooCommerce hanya boleh menerima ringkasan/mirror; sumber kebenaran shipment tetap tabel `shipping_*` Ofissio.

## Arsitektur

```text
Admin order
  -> POST /api/admin/orders/:id/shipping/rates
  -> Biteship /v1/rates/couriers (atau mock)
  -> shipping_quotes
  -> admin memilih quoteId (tanpa mengirim nominal)
  -> POST /api/admin/orders/:id/shipping/create
  -> Biteship /v1/orders (atau mock)
  -> shipping_shipments + shipping_events
  -> legacy tracking bridge
  -> customer order tracking / Ofistant

Biteship webhook
  -> POST /api/shipping/biteship/webhook
  -> secret/signature check
  -> idempotency check
  -> status mapping + tracking customer
```

Origin, destination, item value, quantity, berat, dan dimensi dibangun di server. Client hanya dapat memilih `quoteId` yang sudah dipersist.

## Environment sandbox/staging

Simpan nilai berikut di `.env.local` atau secret manager staging; jangan commit:

```bash
SHIPPING_PROVIDER=biteship
SHIPPING_MODE=sandbox
BITESHIP_ENABLED=true
BITESHIP_MODE=sandbox
BITESHIP_BASE_URL=https://api.biteship.com
BITESHIP_API_KEY=...
BITESHIP_WEBHOOK_SECRET=...
BITESHIP_WEBHOOK_URL=https://staging.example.com/api/shipping/biteship/webhook
BITESHIP_ORIGIN_CONTACT_NAME="Ofissio Fulfillment"
BITESHIP_ORIGIN_CONTACT_PHONE=...
BITESHIP_ORIGIN_ADDRESS="Alamat lengkap gudang"
BITESHIP_ORIGIN_POSTAL_CODE=...
BITESHIP_ORIGIN_AREA_ID=
BITESHIP_COURIERS=jne,sicepat,jnt,anteraja
BITESHIP_TEST_CREATE_SHIPMENT=false
```

Token Biteship hanya dipakai di adapter server-side melalui header `Authorization`. `BITESHIP_WEBHOOK_SECRET` tidak boleh memakai prefix `NEXT_PUBLIC_`.

## Setup database

Review dan jalankan manual:

```text
database/migrations/019_biteship_shipping.sql
```

Migration membuat `shipping_quotes`, `shipping_shipments`, dan `shipping_events`. Row kosong valid. RLS aktif; write menggunakan service-role server setelah permission admin diperiksa.

## Origin warehouse dan package default

Origin berasal dari env warehouse di atas. Destination berasal dari snapshot alamat order atau alamat pengiriman utama perusahaan. Jika keduanya tidak ada, rate check ditolak.

Sampai weight/dimensi per SKU dikelola di katalog, server menggunakan:

```bash
BITESHIP_DEFAULT_ITEM_WEIGHT_GRAM=500
BITESHIP_DEFAULT_ITEM_LENGTH_CM=30
BITESHIP_DEFAULT_ITEM_WIDTH_CM=25
BITESHIP_DEFAULT_ITEM_HEIGHT_CM=5
```

Nilai ini adalah known limitation dan harus dikalibrasi dengan data kemasan riil sebelum live.

## Webhook HTTPS publik

Daftarkan endpoint HTTPS publik berikut di dashboard Biteship:

```text
https://staging.example.com/api/shipping/biteship/webhook
```

Dokumentasi Biteship memungkinkan authentication diperlukan pada webhook. Konfigurasikan dashboard/gateway agar mengirim salah satu:

- `X-Biteship-Webhook-Secret: <BITESHIP_WEBHOOK_SECRET>`; atau
- `Authorization: Bearer <BITESHIP_WEBHOOK_SECRET>`.

Implementasi juga menerima `X-Biteship-Signature` dari digest `sha256(secret + "." + rawBody)` untuk gateway yang mendukung signed digest tersebut. Invalid secret ditolak. Payload yang disimpan hanya metadata aman, bukan alamat/customer payload mentah.

Status asing dipetakan ke `manual_review`, tidak pernah ke `delivered`.

## Cara test

1. Jalankan migration 019.
2. Isi env sandbox lalu restart server.
3. Jalankan `npm run check:env` dan `npm run check:shipping`.
4. Pastikan order berstatus `payment_received`.
5. Buka `/admin/orders/[id]`.
6. Klik **Cek ongkir**, pilih layanan, lalu **Buat shipment**.
7. Klik ulang create: shipment yang sama harus dikembalikan (idempotent).
8. Kirim webhook test dengan secret yang benar; status dan tracking customer harus berubah.
9. Kirim ulang event id yang sama; tidak boleh menggandakan event.
10. Pastikan customer hanya melihat kurir, layanan, resi, status, dan timeline.

`npm run check:shipping` tidak pernah membuat shipment Biteship nyata. Flag `BITESHIP_TEST_CREATE_SHIPMENT` hanya menandai izin smoke eksplisit; transaksi nyata tetap harus memakai order sandbox yang sengaja dipilih admin.

## Pindah live

1. Gunakan credential live berbeda di secret manager.
2. Set `SHIPPING_MODE=live` dan `BITESHIP_MODE=live` secara bersamaan.
3. Pastikan origin, saldo, courier, webhook HTTPS, dan monitoring siap.
4. Jalankan satu order canary dengan nilai rendah.
5. Verifikasi pickup, waybill, webhook, tracking, dan delivery end-to-end.
6. Jangan aktifkan live hanya karena build pass.

## Rollback ke mock

```bash
SHIPPING_PROVIDER=mock
SHIPPING_MODE=sandbox
BITESHIP_ENABLED=false
BITESHIP_TEST_CREATE_SHIPMENT=false
```

Restart aplikasi. Shipment Biteship yang sudah dibuat tetap tersimpan dan dapat dilihat; rollback tidak menghapus data.

## Known limitations

- Berat/dimensi masih memakai default server, belum metadata per SKU/variant.
- Mirror meta shipping ke WooCommerce hanya berjalan bila order sudah punya `woo_order_id` dan sinkronisasi order WooCommerce aktif; kegagalan mirror dicatat aman dan tidak membatalkan shipment Ofissio.
- Webhook memakai shared-secret authentication yang dikonfigurasi di dashboard/gateway karena dokumentasi publik tidak menetapkan satu header signature universal.
- Pickup scheduling khusus dan cancellation provider belum tersedia di UI Task E.
