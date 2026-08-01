# Product Image Upload & Gallery Manager

Task A3.1 menjadikan Ofissio Admin sebagai satu pintu pengelolaan foto produk. File foto disimpan di **WordPress Media Library** dan array `images` WooCommerce tetap menjadi source of truth katalog. Supabase Storage hanya dipakai untuk GLB, logo customer, artwork, dan dokumen.

## Konfigurasi WordPress Media

Gunakan WordPress Application Password untuk user staging yang memiliki permission `upload_files`:

```env
WORDPRESS_MEDIA_BASE_URL=
WORDPRESS_MEDIA_USERNAME=
WORDPRESS_MEDIA_APP_PASSWORD=
WORDPRESS_MEDIA_TOKEN=
PRODUCT_IMAGE_MAX_MB=10
```

`WORDPRESS_MEDIA_BASE_URL` boleh kosong jika sama dengan `WOOCOMMERCE_BASE_URL`. Gunakan salah satu metode auth: `WORDPRESS_MEDIA_TOKEN`, atau pasangan username dan application password. Semua credential hanya dibaca server-side dan tidak boleh memakai prefix `NEXT_PUBLIC_`.

Tidak ada bucket `ofissio-product-images`. `npm run check:storage` hanya memeriksa bucket Supabase untuk logo, artwork, dokumen, dan GLB.

## Cara mengelola foto

1. Buka `/admin/products/new` atau `/admin/products/woocommerce/[id]`.
2. Isi SKU sebelum memilih file.
3. Klik **Upload Foto Utama** untuk menempatkan file di urutan pertama.
4. Klik **Upload Foto Tambahan** untuk memilih satu atau beberapa file gallery.
5. Gunakan **Set sebagai Foto Utama**, **Geser ke Atas**, dan **Geser ke Bawah** untuk mengatur urutan.
6. Gunakan **Hapus Foto** untuk mengeluarkan foto dari product images. Media fisik WordPress tidak dihapus pada task ini.
7. Pada edit produk, klik **Simpan Foto Produk**. Pada create, foto diupload setelah WooCommerce menghasilkan Product ID.

Server Ofissio mengupload binary ke `POST /wp-json/wp/v2/media`, menerima `id` dan `source_url`, lalu mengupdate WooCommerce product `images`. ID media dipakai lebih dulu; source URL menjadi fallback bila API WooCommerce staging menolak ID.

Foto pertama menjadi gambar utama kartu katalog. Foto berikutnya menjadi gallery pada detail produk. Jika foto tidak ada atau gagal dimuat, UI memakai placeholder dan 3D configurator tetap tersedia.

## Validasi

- Extension: `.jpg`, `.jpeg`, `.png`, `.webp`.
- MIME: `image/jpeg`, `image/png`, `image/webp`.
- File signature harus sesuai dengan MIME.
- Maksimal `PRODUCT_IMAGE_MAX_MB`, default 10 MB per file.
- Maksimal 20 foto per produk.
- SVG, PDF, ZIP, TXT, HTML, JavaScript, executable, dan format lain ditolak di client dan server.

## API internal

- `GET /api/admin/products/woocommerce/[id]/images`
- `POST /api/admin/products/woocommerce/[id]/images` dengan multipart field `files`
- `PATCH /api/admin/products/woocommerce/[id]/images` dengan urutan image terbaru

Semua endpoint memakai internal admin guard, permission `admin:catalog:view` atau `admin:catalog:update`, rate limit, validasi, safe error, dan audit log. Customer, anonymous, serta role tanpa `admin:catalog:update` tidak dapat upload.

## Troubleshooting

- **Upload 401/403:** pastikan user WordPress memiliki permission upload media dan Application Password masih aktif.
- **Endpoint tidak ditemukan:** cek `WORDPRESS_MEDIA_BASE_URL` dan permalink/REST API WordPress.
- **Foto tidak tampil:** cek Media Library dan array `images` pada produk WooCommerce.
- **WooCommerce update gagal:** media mungkin sudah tersimpan tetapi belum terpasang ke produk; retry dari halaman edit. Cleanup media orphan dilakukan manual pada task ini.
- **File terlalu besar:** kompres foto atau sesuaikan `PRODUCT_IMAGE_MAX_MB` di env server.
- **Format tidak didukung:** konversi isi file ke JPG, PNG, atau WEBP; mengganti extension saja tetap ditolak.

Jalankan `npm run check:woocommerce` untuk mengecek WooCommerce dan read access WordPress Media bila credential media tersedia.
