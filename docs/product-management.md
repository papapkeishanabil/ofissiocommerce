# One Door Product Management

Task A3 memindahkan pekerjaan harian product admin ke satu pintu Ofissio Admin tanpa mengubah WooCommerce sebagai product source.

## Route

- `/admin/products`: semua produk WooCommerce dan readiness.
- `/admin/products/new`: membuat produk WooCommerce baru beserta field Ofissio.
- `/admin/products/woocommerce/[id]`: mengubah produk, taxonomy, customization, dan GLB.

Role `super_admin` dan `product_admin` memiliki `admin:catalog:update`. Role view-only dapat membuka daftar/detail tetapi API create, update, dan upload tetap menolak permintaan.

## Alur

1. Pilih jenis produk. Tanpa varian memakai satu SKU stok, misalnya `KL-003`. Dengan varian memakai kode model utama, misalnya `SN`, yang boleh sama antar-series; SKU katalog unik dibuat otomatis.
2. Isi atribut produk serta aturan B2B/routing.
3. Pilih teknik customization dan zona bordir.
4. Upload foto utama dan gallery, lalu atur urutannya.
5. Pilih GLB dan versi model.
6. Simpan. Ofissio menulis data ke WooCommerce, mengunggah foto ke WordPress Media Library, dan mengunggah GLB ke Supabase Storage.
7. Periksa readiness. Produk customer hanya muncul jika semua blocking issue selesai.

Task A3.1 mengganti URL manual dengan **Foto Produk** sebagai workflow utama. URL manual tetap tersedia dalam panel Advanced untuk debugging. Detail ada di [product-image-upload.md](product-image-upload.md).

## API internal

- `GET|POST /api/admin/products/woocommerce`
- `GET|PATCH /api/admin/products/woocommerce/[id]`
- `POST /api/admin/products/woocommerce/[id]/3d-model`
- `GET /api/admin/products/woocommerce/[id]/3d-model/status`
- `GET|POST|PATCH /api/admin/products/woocommerce/[id]/images`
- `PATCH /api/admin/products/woocommerce/[id]/variants`

Semua route memakai internal guard, permission catalog, rate limit, validasi Zod, safe error, dan audit log. WooCommerce consumer secret serta Supabase service-role key hanya digunakan server-side.

## Varian produk fleksibel

Pada **Dengan varian**, tambahkan nama pilihan (Warna, Lengan, Saku, Ukuran, atau nama lainnya) beserta nilai yang dipisahkan koma. Jika stok dibedakan per ukuran, gunakan **Tambah pilihan Ukuran**, sesuaikan daftar ukuran, lalu buat kombinasi. Isi **SKU varian** sekali per kelompok, misalnya `KK-006LPD` untuk Pendek dan `KK-006LPJ` untuk Panjang. **Terapkan ke semua ukuran** menghasilkan SKU stok seperti `KK-006LPD-S`, `KK-006LPD-M`, dan seterusnya. Foto dan harga dapat diisi sekali per kelompok. Rincian SKU per ukuran tetap dapat dibuka untuk pengecualian. Pilih **Varian yang tampil pertama** sebelum menyimpan.

SKU yang sudah terisi dipertahankan secara default; penggantian SKU tersimpan memerlukan pilihan eksplisit dan konfirmasi. Ketika ukuran baru ditambahkan, SKU dibuat dari pola kelompok yang konsisten, tanpa mengubah ID/SKU ukuran lama. Jika sebelumnya hanya ada dua varian lengan tanpa ukuran, SKU dan harga lengan menjadi template saat menambahkan pilihan Ukuran; stok agregat lama tidak dibagi secara otomatis ke ukuran baru.

SKU disimpan sebagai varian WooCommerce asli; stok tetap dikelola WooCommerce/Ginee dan tidak direset ketika harga, foto, atau pilihan diedit. Produk tidak dapat dipesan sebelum seluruh varian terverifikasi. Simpan ulang setelah kegagalan akan memakai kembali ID/SKU yang sudah dibuat.

Ukuran mendukung OS, XS, S, M, L, XL, XXL/2XL, 3XL, 4XL, dan 5XL. Produk tanpa pilihan ukuran menggunakan jumlah produk langsung (penanda internal `OS`), bukan akhiran SKU `-OS`. Harga quantity, jika aktif, mengikuti tier produk. Ukuran dengan harga reguler berbeda perlu dimasukkan sebagai item keranjang terpisah.

Produk lama tetap menggunakan editor warna sebelumnya. Tombol **Gunakan editor varian fleksibel** memuat kombinasi asli; seluruh SKU lama harus dipetakan agar tidak terhapus saat migrasi. Produk yang sudah memiliki varian tersimpan tidak dapat diubah menjadi tanpa varian melalui form ini; buat produk baru untuk satu SKU.

### Pemeriksaan lokal

Semua tes berikut menggunakan data sintetis dan provider dalam memori:

```sh
npx tsx --require ./scripts/register-server-only.cjs scripts/test-admin-product-kinds.ts
npx tsx --require ./scripts/register-server-only.cjs scripts/test-product-variants.ts
npm run test:color-variants
npx tsx --require ./scripts/register-server-only.cjs scripts/test-product-size-stock.ts
```

Untuk pengujian browser, jalankan server pengembangan di `127.0.0.1:8017` dengan provider mock, lalu `python scripts/webtest-product-variants.py` setelah tes varian membuat fixture. Skrip memasang route sementara dari `test-fixtures/product-variants/preview-page.tsx`, menangkap seluruh request API, menyimpan screenshot desktop/ponsel ke `docs/previews/product-variants`, dan menghapus route sementara saat selesai.

## Harga quantity Task A5

Form create/edit sekarang memiliki section **Harga & Diskon Quantity**. Admin dapat menambah, menghapus, mereset, dan memvalidasi tier tanpa masuk WooCommerce. Edit produk juga menyediakan endpoint khusus `PATCH /api/admin/products/woocommerce/[id]/quantity-pricing`; create/update utama tetap menerima field pricing yang sama. Detail operasional ada di [quantity-pricing.md](quantity-pricing.md).

## Harga bordir Task A4

Jika produk mendukung bordir, admin hanya memilih zona yang didukung pada section **Customization**. Harga, batas ukuran, setup fee, dan catatan dikelola satu kali melalui `/admin/pricing/embroidery`; detail formula dan validasi tersedia di [embroidery-pricing.md](embroidery-pricing.md). Metadata `embroidery_pricing*` lama di WooCommerce dipertahankan untuk kompatibilitas, tetapi tidak digunakan sebagai sumber hitung.

## Produk referensi A6

`JAKET TEST A3` (`JAK-A3-001`, WooCommerce `#18`) menjadi produk smoke komersial: published, valid, kategori Jaket, industri Mining/Corporate, foto utama dan gallery WordPress, GLB Supabase, quantity tier, serta zona Dada Kiri/Punggung Tengah. Readiness tidak memiliki blocking issue. Data ini sebaiknya dipertahankan selama regression A6 masih digunakan.
