# Phase 4C — Product data dan GLB

`src/features/products/product.service.ts` adalah satu-satunya akses produk
untuk UI customer, Ofistant, dan cart. Repository lokal di Phase 4C dapat
diganti repository WooCommerce pada Phase 8 tanpa mengubah konsumennya.

## Menambah produk mock

1. Simpan GLB produk di `public/models/products/<slug>.glb`.
2. Tambahkan data dasar produk di `src/data/products.ts`.
3. Tambahkan metadata produk/model di
   `src/features/products/product.mock-data.ts`.
4. Isi `model_3d.id`, `url`, `filename`, `version`, `source`, `file_type:
   "glb"`, `uploaded_at`, dan `is_required: true`.
5. Isi `embroidery_zones` dan `camera_presets` yang benar-benar didukung.
6. Ubah status menjadi `published` hanya setelah URL dan file GLB siap.

Produk `draft` atau `archived`, serta produk dengan metadata GLB tidak valid,
tidak dikembalikan oleh service customer-facing dan tidak dapat masuk cart.

## Pengecualian kompatibilitas KK-006

KK-006 mempertahankan file dan URL aktif `/3d/kk-006.glb`. Preload product
detail dan viewer membaca URL yang sama dari `product.model_3d.url`, sehingga
cache GLTF tidak mengunduh dua URL berbeda.

## Phase 8

Implementasikan `mapWooCommerceProductToOfissioProduct()` dan ganti isi
`product.repository.ts` dengan adapter WooCommerce. Custom field GLB yang
kosong atau tidak berakhiran `.glb` harus gagal dalam validasi catalog/cart.

## Uji manual

- Katalog: `/catalog` hanya menampilkan produk published dengan GLB valid.
- Detail: `/product/kemeja-kantor-kk-006` menampilkan metadata model.
- Ofistant: pilih industri Corporate lalu periksa rekomendasi KK-006.
- 3D: buka Studio Bordir dan pastikan model, zona, serta preset berasal dari
  data KK-006.
- Cart: isi MOQ, simpan konfigurasi, lalu tambah ke cart. Item harus menyimpan
  `model3dId`, `model3dUrl`, dan `embroideryPlacements`.
