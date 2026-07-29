# Ofissio WooCommerce Bridge Plugin

Phase 8 menyediakan skeleton ringan di `wordpress-plugins/ofissio-commerce-bridge`.

Tujuan plugin nanti:

1. Menambahkan field Ofissio di WooCommerce Product Admin.
2. Validasi GLB sebelum publish.
3. Menyediakan field `model_3d_url`, `model_3d_id`, `model_3d_version`, `model_3d_source`, dan `model_3d_filename`.
4. Menyediakan field `embroidery_zones` dan `camera_presets`.
5. Memudahkan admin mengelola produk tanpa edit kode.

Yang sudah ada di Phase 8:

- struktur plugin
- file bootstrap
- class placeholder untuk product fields, product meta, REST API, dan security
- README plugin

Yang belum dibuat:

- UI admin lengkap
- validasi publish yang ketat
- upload media GLB custom
- endpoint REST produksi

Skeleton ini tidak terhubung ke build Next.js, sehingga tidak memengaruhi aplikasi Ofissio.

## Phase 18 direction

Bridge plugin nantinya perlu membantu:

- validasi metadata GLB sebelum publish;
- field upload/URL GLB yang aman;
- field zones bordir dan camera presets;
- preview status "Ofissio-ready";
- optional helper untuk menampilkan `ofissio_order_id` pada WooCommerce order admin.
