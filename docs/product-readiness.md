# Product Readiness Notification

Task A2.6 menjelaskan kenapa produk yang sudah dibuat di WooCommerce belum muncul di Ofissio. WooCommerce tetap menjadi sumber produk, tetapi customer hanya melihat produk yang aman dan lengkap untuk dipesan.

## Cara melihat status

1. Buka `/admin/products`.
2. Cari produk berdasarkan nama, SKU, atau Woo Product ID pada tabel.
3. Lihat **Status Ofissio**, **Status 3D**, dan **Yang Belum Lengkap**.
4. Klik **Lengkapi Produk** untuk melihat semua blocking issue dan warning.
5. Gunakan **Buka WooCommerce** untuk memperbaiki field sumber.
6. Buka ulang detail produk agar readiness dihitung dari data terbaru.

Upload GLB di Ofissio Admin masih disabled. Tombol tersebut baru diaktifkan pada Task A3.

## Field blocking

Produk hanya tampil jika seluruh field berikut valid:

- status WooCommerce `publish`;
- SKU;
- harga;
- minimal satu kategori;
- minimal satu industri;
- `has_3d_model=true`;
- GLB valid dari `model_3d_url`, storage bucket/key, atau URL resolver internal;
- `model_3d_id`;
- `model_3d_version`;
- `model_3d_source`;
- `model_3d_filename`;
- MOQ;
- lead time;
- fulfillment type valid;
- transaction mode valid.

Produk dengan blocking issue berstatus **Belum Tampil**, **Draft WooCommerce**, atau **Invalid 3D Model**.

## Warning non-blocking

Field ini sebaiknya dilengkapi tetapi tidak memblokir katalog pada A2.6:

- deskripsi panjang;
- foto tambahan;
- atribut warna;
- atribut bahan;
- atribut ukuran;
- quantity pricing tiers;
- embroidery pricing;
- `supports_embroidery=false`;
- zona bordir kosong.

Jika `supports_embroidery=true` namun zona kosong, admin melihat warning kuat **Zona bordir belum dipilih.** Pricing bordir dan quantity tiers tetap menunggu Task A4 dan A5.

## Contoh JAKET TEST

`JAKET TEST` tetap terlihat pada `/admin/products`, tetapi tidak muncul di katalog customer selama field blocking seperti status model 3D, file GLB, MOQ, industri, lead time, fulfillment, atau transaction mode belum lengkap. Daftar aktual selalu dihitung dari response WooCommerce, bukan teks contoh yang di-hardcode.

## Customer dan Ofistant

- `/catalog`, detail customer, cart, dan `/api/catalog/search` hanya memakai produk valid.
- Ofistant menggunakan catalog search yang sama dan tidak menyebut produk incomplete.
- Readiness detail hanya tersedia melalui route admin yang dilindungi internal guard dan RBAC.

## API admin

- `GET /api/admin/products/woocommerce`
- `GET /api/admin/products/woocommerce/[id]`
- `GET /api/admin/products/woocommerce/[id]/readiness`

Endpoint memakai `admin:catalog:view`, rate limit, safe error response, dan audit log. Response hanya berisi field produk yang telah dipilih; raw provider payload dan secret WooCommerce tidak diteruskan.
