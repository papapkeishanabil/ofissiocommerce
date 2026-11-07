# Pengaturan SEO halaman Commerce

Panel **Pengaturan SEO** berada di:

- Produk: `/admin/products/new` dan `/admin/products/woocommerce/[id]`.
- Kategori: `/admin/catalog/categories`, pada form tambah/edit kategori.
- Halaman industri: `/admin/site-content/industri`, pada editor inspirasi setiap industri. Ini berbeda dari Industry Master, yang mengatur taxonomy pencarian produk.

Isi keyword utama dan keyword terkait untuk panduan tim. Judul dan deskripsi manual terpisah dari nama/deskripsi publik. Panel menampilkan metadata efektif; kolom manual kosong memakai nilai otomatis. Simpan menggunakan tombol simpan editor yang sudah ada. Tidak ada keyword contoh yang diisikan otomatis.

## Sumber dan publikasi

| Jenis | Penyimpanan | Pemakaian publik |
| --- | --- | --- |
| Produk | WooCommerce REST API `meta_data`, key `ofissio_page_seo` (JSON) | Mapper membaca judul/deskripsi, lalu `productSearchMetadata` membentuk metadata Next.js |
| Kategori | Supabase `catalog_category_metadata.seo`, identitas tetap Woo category ID | URL filter lama `/catalog?kategori=<slug>` dan alias `category`; canonical tetap `/catalog` |
| Industri | `site_content`, section `industri`, field `inspiration.seo` atau `inspirationPages[].seo` | `/inspirasi/[slug]`, termasuk route khusus `/inspirasi/bengkel-teknisi` |

Produk mengikuti status draft/publish dan readiness lama. Kategori mengikuti active state. Industri mengikuti penyimpanan/publikasi section konten yang sudah ada; cache `site-content` dan revalidasi route tetap dipakai. Produk/kategori dibaca dinamis. Tidak ada perubahan slug, URL baru, canonical, aturan indeks, atau sitemap. Kategori masih merupakan filter dengan canonical katalog; fitur ini tidak menjadikannya halaman indeks mandiri.

Keyword produk tidak dimasukkan dalam proyeksi produk publik. Keyword industri dibersihkan sebelum objek konten dikirim ke storefront/client. Keyword kategori tidak ikut public taxonomy. Metadata halaman yang didukung menonaktifkan warisan tag `meta keywords` dari layout. `htmlLimitedBots: /.*/` membuat metadata ditunggu sebelum HTML awal dikirim, termasuk untuk browser biasa; konsekuensinya respons awal menunggu pembacaan metadata.

Payload SEO yang tidak dikirim oleh klien lama mempertahankan pengaturan tersimpan. Objek SEO dengan judul/deskripsi kosong secara eksplisit mengembalikan nilai otomatis. Metadata produk manual lama dari Yoast/Rank Math yang tersedia melalui Woo `meta_data` dibaca sebelum ada pengaturan Ofissio sendiri; key plugin tidak dihapus. Kata target tidak ditambahkan ke deskripsi produk.

## Rilis

1. Jalankan `database/migrations/045_catalog_category_seo.sql` sebelum merilis kode. Migrasi hanya menambah kolom JSONB dengan default `{}`; RLS dan grants tabel lama dipertahankan. Tidak perlu backfill halaman lama.
2. Produk menggunakan metadata Woo yang sudah ada; tidak memerlukan migrasi WordPress/plugin. Industri memakai JSON section lama; tidak memerlukan migrasi tambahan.
3. Rilis kode mengikuti prosedur repo. Uji simpan dan baca kembali di lingkungan tujuan dengan akun yang memiliki `admin:catalog:update` atau `admin:content:update`. Pengujian lokal menggunakan kontrak Woo sintetis, bukan akses tulis Woo produksi.

## Pengujian lokal

```powershell
rtk proxy node node_modules/tsx/dist/cli.mjs --require ./scripts/register-server-only.cjs scripts/test-page-seo.ts
rtk proxy node node_modules/tsx/dist/cli.mjs --require ./scripts/register-server-only.cjs scripts/test-category-seo-storage.ts
rtk proxy node node_modules/tsx/dist/cli.mjs scripts/test-product-search-metadata.ts
rtk proxy python test-fixtures/seo/woo-server.py
# Terminal terpisah: port 8096 harus tersedia.
rtk proxy python scripts/run-seo-local.py
# Terminal terpisah: memakai server lokal port 8097.
rtk proxy python scripts/webtest-page-seo.py
```

Server lokal memaksa database mock, Woo lokal, autentikasi development, dan font fixture offline. Tidak menyalin kredensial produksi. Bukti HTML awal dan screenshot panel disimpan di `.artifacts/seo-settings/`.

Verifikasi 7 November 2026: alur simpan melalui browser untuk ketiga editor dan 11 pemeriksaan HTML awal lulus, termasuk manual/reset, pemisahan keyword, dan canonical. Uji layanan mencakup produk lama/baru, pelestarian metadata manual, serta default seluruh 20 halaman industri. Typecheck lulus; lint seluruh repo tanpa error (9 warning di bagian lain). `npm run build -- --webpack` lengkap beserta prebuild lulus dengan data mock dan font fixture offline. Cache build ditempatkan sementara di drive C karena drive workspace penuh; kode fitur tetap diuji dari workspace yang sama. Migrasi belum diterapkan ke database produksi dan fitur belum dideploy.
