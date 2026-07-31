# Catalog Taxonomy Foundation

Task A2.5 memisahkan tiga konsep agar katalog dan Ofistant tidak mencampur jenis produk dengan target penggunaannya.

## Sumber data

| Konsep | Contoh | Source of truth |
| --- | --- | --- |
| Product category | Kemeja, Jaket, Wearpack | WooCommerce Product Categories |
| Industry | Corporate, Mining, Hospitality | Ofissio industry master |
| Product attribute | Warna, Ukuran, Bahan | WooCommerce Product Attributes |

Kategori menjawab “produk apa”, industri menjawab “dipakai untuk sektor apa”, dan atribut menjawab “spesifikasinya bagaimana”.

## Route admin

- `/admin/catalog/categories` membaca dan mengubah WooCommerce categories. Active state serta synonym disimpan sebagai metadata Ofissio.
- `/admin/catalog/industries` mengelola master industri Ofissio.
- `/admin/catalog/attributes` membaca global attributes dan terms WooCommerce. Task A2.5 masih read-only.

Endpoint admin memakai internal guard, permission `admin:catalog:view` atau `admin:catalog:update`, rate limit, safe error, dan audit event.

## Persistence

Review lalu jalankan `database/migrations/010_catalog_taxonomy.sql` secara manual di Supabase staging. Migration membuat:

- `catalog_category_metadata`
- `industries`

Sebelum migration diterapkan, development memakai seed/in-memory fallback agar UI dapat direview. Perubahan fallback tidak bertahan setelah server restart.

## Product fields

Mapper WooCommerce mengekspos:

- `categories`
- `categorySlugs`
- `industries`
- `industrySlugs`
- `tags`
- `attributes`
- `searchableTerms`

Field legacy `category` dan `industries` tetap tersedia agar halaman customer lama tidak rusak.

## Troubleshooting

Jika produk tidak muncul:

1. Pastikan produk `publish`, punya SKU, harga, kategori, dan meta `industries`.
2. Pastikan GLB, MOQ, lead time, fulfillment, dan transaction mode valid.
3. Pastikan kategori/industri terkait aktif.
4. Pastikan slug pada meta `industries` cocok dengan industry master.
5. Jalankan `npm run check:woocommerce`.

`Uncategorized` secara teknis adalah kategori, tetapi sebaiknya diganti dengan kategori bisnis yang benar agar pencarian seperti “kemeja” bekerja akurat.
