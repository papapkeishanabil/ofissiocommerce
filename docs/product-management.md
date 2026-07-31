# One Door Product Management

Task A3 memindahkan pekerjaan harian product admin ke satu pintu Ofissio Admin tanpa mengubah WooCommerce sebagai product source.

## Route

- `/admin/products`: semua produk WooCommerce dan readiness.
- `/admin/products/new`: membuat produk WooCommerce baru beserta field Ofissio.
- `/admin/products/woocommerce/[id]`: mengubah produk, taxonomy, customization, dan GLB.

Role `super_admin` dan `product_admin` memiliki `admin:catalog:update`. Role view-only dapat membuka daftar/detail tetapi API create, update, dan upload tetap menolak permintaan.

## Alur

1. Isi informasi produk, SKU, harga, kategori, dan industri.
2. Isi atribut produk serta aturan B2B/routing.
3. Pilih teknik customization dan zona bordir.
4. Pilih GLB dan versi model.
5. Simpan. Ofissio menulis data ke WooCommerce lalu mengunggah GLB ke Supabase Storage.
6. Periksa readiness. Produk customer hanya muncul jika semua blocking issue selesai.

Gambar produk pada Task A3 menggunakan input URL, satu URL per baris. Upload media WordPress langsung belum diaktifkan.

## API internal

- `GET|POST /api/admin/products/woocommerce`
- `GET|PATCH /api/admin/products/woocommerce/[id]`
- `POST /api/admin/products/woocommerce/[id]/3d-model`
- `GET /api/admin/products/woocommerce/[id]/3d-model/status`

Semua route memakai internal guard, permission catalog, rate limit, validasi Zod, safe error, dan audit log. WooCommerce consumer secret serta Supabase service-role key hanya digunakan server-side.

## Harga quantity Task A5

Form create/edit sekarang memiliki section **Harga & Diskon Quantity**. Admin dapat menambah, menghapus, mereset, dan memvalidasi tier tanpa masuk WooCommerce. Edit produk juga menyediakan endpoint khusus `PATCH /api/admin/products/woocommerce/[id]/quantity-pricing`; create/update utama tetap menerima field pricing yang sama. Detail operasional ada di [quantity-pricing.md](quantity-pricing.md).

## Harga bordir Task A4

Jika produk mendukung bordir, admin mengatur enam zona melalui section **Harga Bordir per Zona**. Harga, batas ukuran, setup fee opsional, dan catatan disimpan ke meta `embroidery_pricing`. Endpoint edit khusus adalah `PATCH /api/admin/products/woocommerce/[id]/embroidery-pricing`; detail formula dan validasi tersedia di [embroidery-pricing.md](embroidery-pricing.md).
