# Ofistant Catalog Search

Ofistant menormalisasi bahasa customer menjadi filter taxonomy sebelum membuka katalog. Taxonomy aktif dibaca dari `GET /api/catalog/taxonomy`; jika endpoint belum tersedia, client memakai vocabulary seed aman. Pencarian produk aktual dipreflight melalui `GET /api/catalog/search?q=...`.

## Contoh mapping

| Input | Category | Industry |
| --- | --- | --- |
| `jaket` | `jaket` | - |
| `kemeja kantor` | `kemeja` | `corporate` |
| `wearpack tambang` | `wearpack` | `mining` |
| `rompi proyek` | `rompi` | `construction` |
| `seragam hotel` | - | `hospitality` |
| `polo shirt` | `kaos-polo` | - |
| `baju security` | `seragam-security` | `security` |

Normalizer menghasilkan:

- `categorySlugs`
- `industrySlugs`
- `attributeHints`
- `searchTerms`

Ofistant tidak membuat nama produk sendiri. API search dan action `SHOW_PRODUCTS` memakai product service/WooCommerce, lalu membuka `/catalog` dengan filter slug. Jika hasil API kosong, Ofistant dan katalog menawarkan category/industry aktif sebagai alternatif.

Jika vocabulary mengenali kategori tetapi kategori tersebut belum dibuat di WooCommerce, search memakai fallback nama/searchable terms. Setelah category slug tersedia di WooCommerce, filtering otomatis menjadi strict berdasarkan category assignment.

## Synonym

Category synonym dikelola di `/admin/catalog/categories`. Industry synonym dikelola di `/admin/catalog/industries`. Hanya row aktif yang masuk customer-safe taxonomy.

Perubahan taxonomy dicache maksimal lima menit oleh endpoint public. Reload browser atau tunggu cache berakhir untuk melihat synonym baru di sesi Ofistant yang sudah terbuka.

## Guardrail

- Produk yang tidak ada di catalog API tidak disebut sebagai hasil.
- Produk standar tidak disebut out of stock.
- Empty result menawarkan filter alternatif atau handoff ke sales.
- Response public tidak memuat ID internal industry, sort order, atau metadata storage/provider.
