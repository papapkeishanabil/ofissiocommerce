# Ginee Inventory Read-Only Stock Checker

Task G1 menghubungkan Ofissio ke Ginee hanya untuk diagnosis jumlah stok SKU di
warehouse/marketplace. Integrasi ini bukan order sync dan bukan two-way sync.

Sumber stok utama yang dibaca halaman produk dan order Ofissio adalah
WooCommerce, dengan aliran `Ginee → WooCommerce → Ofissio`. Halaman integrasi
Ginee tidak digunakan sebagai dependency product detail atau order workbench.

## Batas tanggung jawab

Yang tersedia:

- cek koneksi Ginee;
- mapping Stock SKU Ofissio/WooCommerce ke SKU Ginee;
- cek stok per SKU dan per warehouse;
- menyimpan snapshot jumlah stok serta waktu pengecekan;
- laporan SKU yang belum dipetakan.

Yang tidak tersedia:

- import order marketplace;
- accept, cancel, ship, atau update order Ginee;
- update/push stok ke Ginee;
- sinkronisasi stok dua arah;
- webhook order Ginee.

## Prinsip SKU

- Parent SKU adalah kode model, misalnya `KK-006`.
- Stock SKU adalah kode model + ukuran, misalnya `KK-006-S`, `KK-006-M`, dan
  `KK-006-L`.
- Matching utama selalu Stock SKU per ukuran.
- Nama produk tidak boleh menjadi matching key utama.
- Warna boleh kosong karena mayoritas produk Ofissio tidak memiliki varian
  warna.
- WooCommerce Product ID, WooCommerce Variation ID, dan Ginee Warehouse ID
  hanya referensi teknis.

SKU di WooCommerce dan Ginee harus sama. Jika kode berbeda, buat mapping
eksplisit dari halaman `/admin/integrations/ginee`.

## Environment

```env
GINEE_ENABLED=false
GINEE_MODE=sandbox
GINEE_BASE_URL=https://api.ginee.com
GINEE_COUNTRY=ID
GINEE_ACCESS_KEY=
GINEE_SECRET_KEY=
GINEE_TEST_LIVE=false
```

`GINEE_ACCESS_KEY` dan `GINEE_SECRET_KEY` hanya boleh berada di server. Jangan
menggunakan prefix `NEXT_PUBLIC_`.

`GINEE_TEST_LIVE=false` memastikan check lokal memakai provider mock dan tidak
memanggil API nyata. Ubah menjadi `true` hanya ketika sengaja melakukan smoke
test inventory read-only dengan credential sandbox/live yang benar.

## Database

Jalankan `database/migrations/021_ginee_readonly_integration.sql` setelah
migration 020. Migration menyediakan:

- `ginee_product_mappings`;
- `ginee_inventory_snapshots`.

Kedua tabel memakai forced RLS, tidak memiliki browser policy, dan hanya dapat
diakses repository server menggunakan service role.

Jika draft Task G1 lama pernah diterapkan, tabel order/webhook lama tidak
dihapus otomatis untuk menghindari kehilangan data. Aplikasi tidak lagi membaca
atau menulis tabel tersebut.

## API Ofissio

- `GET /api/admin/integrations/ginee/health`
- `GET /api/admin/integrations/ginee/inventory?sku=KK-006-M`
- `GET /api/admin/integrations/ginee/mappings`
- `POST /api/admin/integrations/ginee/mappings`
- `POST /api/admin/integrations/ginee/check-stock`

Seluruh endpoint membutuhkan internal admin RBAC. Customer dan anonymous tidak
dapat mengaksesnya.

Contoh body stock check:

```json
{
  "sku": "KK-006-M"
}
```

Stock check hanya membaca Ginee. Penyimpanan `last_stock`, `last_checked_at`,
dan snapshot dilakukan di database Ofissio untuk audit internal.

Untuk monitoring stok operasional dari WooCommerce, lihat
[woocommerce-stock-monitoring.md](./woocommerce-stock-monitoring.md).

## Verifikasi

```powershell
npm run check:ginee
npm run check:env
npm run typecheck
npm run lint
npm run build
npm run check:all
```

`check:ginee` membuktikan signer, allowlist inventory-only, SKU `KK-006-S/M/L`,
snapshot per warehouse, RBAC, secret scan, tidak adanya API order/destructive,
dan bahwa API nyata tidak dipanggil selama `GINEE_TEST_LIVE` bukan `true`.

## Referensi API Ginee

- [Getting started dan request signature](https://doc.ginee.com/_get_started.html)
- [Warehouse inventory list](https://doc.ginee.com/api/warehouseInventory/_list_warehouse_inventory.html)

Endpoint order Ginee sengaja tidak digunakan pada Task G1.
