# WooCommerce Stock Monitoring

## Arsitektur

Aliran stok operasional Ofissio adalah:

```text
WooCommerce Ofissio -> Ofissio Admin
```

WooCommerce Ofissio adalah sumber resmi produk dan stok admin pada fase ini.
Integrasi Ginee tidak menjadi dependency product detail maupun order workbench.
Ofissio membaca stok WooCommerce secara read-only untuk membantu staf menentukan
kebutuhan fulfillment dan replenishment; Ofissio tidak menulis jumlah stok.

## Aturan SKU

- Parent SKU adalah kode model, misalnya `KK-006`.
- Stock SKU adalah Parent SKU ditambah ukuran, misalnya `KK-006-S`,
  `KK-006-M`, dan `KK-006-L`.
- Jika warna menjadi variation, formatnya Parent SKU + warna + ukuran, misalnya
  `TG-055-CAMEL-M`.
- Setiap variasi ukuran wajib memiliki Stock SKU unik.
- Gunakan variable product dan aktifkan `manage_stock` pada setiap variation.
- Nama produk tidak digunakan sebagai matching key utama.
- WooCommerce variation ID hanya referensi teknis.

Jika produk mempunyai atribut ukuran tetapi variasinya tidak memiliki SKU,
Ofissio menampilkan warning internal dan tidak menebak jumlah stok. Aturan
lengkap tersedia di [`woocommerce-product-standard.md`](./woocommerce-product-standard.md).

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

## Customer visibility

- Catalog, product detail, cart, dan checkout tidak menerima jumlah/status stok.
- Copy `stok habis` atau `out of stock` tidak digunakan pada customer UI.
- Stok yang kurang tidak memblokir checkout atau request quotation.
- Kekurangan stok diselesaikan sebagai replenishment internal admin.

## Environment

```env
STOCK_MONITORING_ENABLED=true
STOCK_DEFAULT_MINIMUM_QTY=10
STOCK_SOURCE=woocommerce
STOCK_CUSTOMER_VISIBILITY=false
```

`STOCK_SOURCE` wajib `woocommerce` dan `STOCK_CUSTOMER_VISIBILITY` wajib `false`.

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
npm run check:woocommerce-product-standard
npm run typecheck
npm run lint
npm run build
npm run check:all
```

Check menggunakan contract fixture secara default dan hanya membaca WooCommerce
live jika integrasi aktif. Check tidak menulis stok dan tidak memanggil Ginee.

## Batasan saat ini

- Ketepatan stok bergantung pada disiplin update stok WooCommerce Ofissio.
- Ofissio membaca data saat halaman admin dibuka; belum ada push/realtime UI.
- Threshold variation dipakai jika tersedia; selain itu sistem memakai
  `STOCK_DEFAULT_MINIMUM_QTY`.
- Penyelesaian request replenishment masih memakai workflow operasional yang ada;
  modul perencanaan produksi penuh tidak ditambahkan.
