# WooCommerce Stock Monitoring

## Arsitektur

Aliran stok operasional Ofissio adalah:

```text
Ginee → WooCommerce → Ofissio Admin
```

Ginee tetap menjadi sumber sinkronisasi inventory warehouse/marketplace menuju
WooCommerce. Ofissio tidak memanggil Ginee dari halaman produk atau order.
Ofissio membaca stok WooCommerce secara read-only untuk membantu staf menentukan
kebutuhan fulfillment dan replenishment.

Integrasi Ginee langsung di `/admin/integrations/ginee` tetap tersedia hanya
untuk diagnosis dan pencocokan SKU. Integrasi itu bukan sumber stok utama pada
product detail atau order workbench.

## Aturan SKU

- Parent SKU adalah kode model, misalnya `KK-006`.
- Stock SKU adalah parent SKU ditambah ukuran, misalnya `KK-006-S`,
  `KK-006-M`, dan `KK-006-L`.
- Setiap variasi ukuran WooCommerce wajib memiliki Stock SKU unik.
- Nama produk tidak digunakan sebagai matching key utama.
- WooCommerce variation ID hanya referensi teknis.

Jika sebuah produk mempunyai atribut ukuran tetapi variasinya tidak memiliki
SKU, Ofissio menampilkan warning internal dan tidak menebak jumlah stok.

## Status internal

- **Aman**: stok sama dengan atau di atas minimum.
- **Menipis**: stok di bawah minimum, tetapi belum nol.
- **Perlu produksi**: stok nol atau kebutuhan order melebihi stok tersedia.
- **Belum sinkron**: SKU, `manage_stock`, atau jumlah stok belum lengkap.

Status ini hanya untuk staf. Customer tidak melihat angka stok, status
`out of stock`, shortage, atau warning replenishment. Produk standar tetap dapat
dipesan; shortage menjadi pekerjaan internal.

## Halaman admin

### Detail produk

`/admin/products/woocommerce/[id]` menampilkan matriks stok per ukuran dengan:

- Stock SKU dan ukuran;
- jumlah stok dan status WooCommerce;
- `manage_stock`;
- batas minimum;
- shortage terhadap minimum;
- waktu pengecekan terakhir;
- tombol request replenishment saat dibutuhkan.

### Detail order

`/admin/orders/[id]` membandingkan size matrix order dengan variasi WooCommerce:

- required quantity;
- available stock;
- shortage;
- status per Stock SKU;
- request produksi/replenishment untuk shortage.

Request menggunakan perhitungan ulang server-side dan idempotency key. Klik
ulang untuk order dan SKU yang sama tidak membuat request ganda. Pembuatan
request tidak membuat process order kedua; ia hanya menandai kebutuhan
replenishment internal pada order yang sudah ada.

## Environment

```env
STOCK_MONITORING_ENABLED=true
STOCK_DEFAULT_MINIMUM_QTY=10
STOCK_SOURCE=woocommerce
STOCK_CUSTOMER_VISIBILITY=false
```

`STOCK_SOURCE` saat ini wajib `woocommerce` dan
`STOCK_CUSTOMER_VISIBILITY` wajib `false`.

## Database

Terapkan migration berikut secara manual di Supabase staging:

```text
database/migrations/022_woocommerce_stock_monitoring.sql
```

Migration membuat `production_replenishment_requests` dengan forced RLS,
akses browser direvoke, dan uniqueness pada idempotency key.

## Verifikasi

```powershell
npm run check:woocommerce
npm run check:woocommerce-stock
npm run typecheck
npm run lint
npm run build
npm run check:all
```

`check:woocommerce-stock` menggunakan contract fixture secara default dan hanya
membaca WooCommerce live jika integrasi WooCommerce aktif. Check tidak menulis
stok dan tidak memanggil Ginee.

## Batasan saat ini

- Perubahan stok real-time bergantung pada sinkronisasi Ginee ke WooCommerce.
- Ofissio membaca data ketika halaman admin dibuka; belum ada push/realtime UI.
- Threshold variasi WooCommerce dipakai jika tersedia, selain itu memakai
  `STOCK_DEFAULT_MINIMUM_QTY`.
- Penyelesaian request replenishment masih dilakukan melalui workflow
  operasional yang ada; modul perencanaan produksi penuh tidak ditambahkan.
