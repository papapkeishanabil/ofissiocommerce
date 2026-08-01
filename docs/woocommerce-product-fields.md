# WooCommerce Product Fields for Ofissio

Dokumen ini menjelaskan cara menambahkan produk WooCommerce agar tampil di Ofissio.

## Field standar WooCommerce

Isi field berikut di WooCommerce Product Admin:

- `name`
- `SKU`
- `price` / `regular_price` / `sale_price`
- `category`
- `images`
- `description`
- `short_description`

Produk harus berstatus `publish`. Produk draft/private tidak tampil di Ofissio.

Harga dasar wajib lebih dari 0. Produk tanpa SKU atau tanpa harga dasar tidak tampil dan tidak bisa masuk cart.
Minimal satu WooCommerce Product Category wajib dipilih. Hindari `Uncategorized` agar category search Ofistant tetap akurat.

## Field custom Ofissio wajib

Tambahkan meta/custom fields:

- `model_3d_url`
- `model_3d_id`
- `model_3d_version`
- `model_3d_source`
- `model_3d_filename`
- `has_3d_model`
- `moq`
- `lead_time`
- `fulfillment_type`
- `transaction_mode`
- `industries`

Aturan GLB:

- `has_3d_model` harus `true`.
- `model_3d_url` boleh berupa URL `.glb` legacy atau endpoint resolver signed URL internal.
- Sebagai foundation A3, pasangan `model_3d_storage_bucket` dan `model_3d_storage_key` dengan key `.glb` juga dikenali oleh readiness checker.
- `model_3d_filename` wajib berakhiran `.glb`.
- `model_3d_id`, `model_3d_version`, dan `model_3d_source` wajib ada.
- Produk tanpa SKU tidak valid.
- Produk tanpa GLB valid tidak tampil di katalog dan tidak bisa masuk cart.
- `moq`, `lead_time`, `fulfillment_type`, `transaction_mode`, dan `industries` wajib ada.

Nilai `fulfillment_type` dari WooCommerce dinormalisasi sebelum masuk enum internal Ofissio:

- `READY_STOCK`, `ready_stock`, `ready-stock` → `READY_STOCK`
- `READY_STOCK_WITH_CUSTOMIZATION`, `ready_stock_with_customization`, `ready-stock-with-customization`, `ready_stock_customization` → `READY_STOCK`
- `MADE_TO_ORDER`, `made_to_order`, `made-to-order` → `MADE_TO_ORDER`
- `QUOTATION_ONLY`, `quotation_only`, `quotation-only` → `MADE_TO_ORDER`

Jika ada meta duplikat dengan key sama, Ofissio memakai value terakhir yang tidak kosong.
Nilai `transaction_mode` juga menerima format lowercase/dash seperti `hybrid`, `direct-checkout`, atau `request_quotation`, lalu dinormalisasi ke enum uppercase internal.

## Field custom bordir

- `supports_embroidery`
- `embroidery_zones`
- `camera_presets`

Jika `supports_embroidery=true` tetapi `embroidery_zones` kosong, readiness menampilkan warning kuat. Kondisi ini belum memblokir katalog pada Task A2.6 karena pricing dan workflow bordir dilanjutkan pada Task A4.

Nilai zona bordir yang didukung:

- `left_chest`
- `right_chest`
- `left_sleeve`
- `right_sleeve`
- `upper_back`
- `center_back` (dinormalisasi ke zona viewer internal `middle_back`)

Nilai legacy `back` dan `middle_back` tetap diterima dan dinormalisasi ke zona punggung tengah.

Camera presets yang didukung:

- `front`
- `back`
- `left`
- `right`
- `left_chest`
- `right_chest`

## Field opsional

- `available_colors`
- `available_sizes`
- `material`
- `gender`
- `sleeve_type`
- `usage`
- `safety_features`
- `supports_screen_printing`
- `supports_dtf`
- `supported_3d_colors`
- `b2b_notes`

## Format array

Field array boleh berupa JSON array atau string dipisahkan koma.
Untuk field seperti `embroidery_zones`, array object dari WooCommerce juga diterima selama object punya `id`, `value`, `slug`, `name`, atau `label`. Ofissio akan mengambil value pertama yang tersedia, dengan prioritas `id`.

Contoh:

```json
["Corporate", "Perhotelan", "Security"]
```

atau:

```text
Corporate, Perhotelan, Security
```

Meta `industries` juga menerima slug lowercase:

```json
["corporate", "mining"]
```

serta format lama:

```text
corporate
```

atau:

```text
corporate,mining
```

## Category, tag, dan attributes

Mapper membaca seluruh `categories`, `tags`, dan `attributes` WooCommerce. Domain product mengekspos `categorySlugs`, `industrySlugs`, `attributes`, dan `searchableTerms` untuk katalog/Ofistant.

Global product attributes tetap dikelola dari WooCommerce. Halaman `/admin/catalog/attributes` hanya menyediakan read/list foundation pada Task A2.5.

## Contoh meta_data KK-006

```json
[
  { "key": "model_3d_url", "value": "/3d/kk-006.glb" },
  { "key": "model_3d_id", "value": "kk-006-v1" },
  { "key": "model_3d_version", "value": "v1" },
  { "key": "model_3d_source", "value": "manual" },
  { "key": "model_3d_filename", "value": "kk-006.glb" },
  { "key": "has_3d_model", "value": "true" },
  { "key": "moq", "value": "20" },
  { "key": "lead_time", "value": "9 hari kerja" },
  { "key": "fulfillment_type", "value": "MADE_TO_ORDER" },
  { "key": "transaction_mode", "value": "HYBRID" },
  { "key": "industries", "value": ["Corporate", "Perhotelan", "Security"] },
  { "key": "available_colors", "value": ["Abu Color Block", "Navy Color Block", "Black Color Block"] },
  { "key": "available_sizes", "value": ["S", "M", "L", "XL", "2XL", "3XL"] },
  { "key": "material", "value": "Katun-poly premium 180 gsm, color-block panel" },
  { "key": "supports_embroidery", "value": "true" },
  { "key": "embroidery_zones", "value": ["left_chest", "right_chest", "left_sleeve", "right_sleeve", "upper_back", "middle_back"] },
  { "key": "camera_presets", "value": ["front", "back", "left", "right", "left_chest", "right_chest"] }
]
```

## Quantity pricing Task A5

| Meta key | Nilai |
| --- | --- |
| `quantity_pricing_enabled` | boolean, default `true` |
| `quantity_pricing_mode` | `fixed_unit_price` |
| `quantity_basis` | `total_order_qty` |
| `quantity_pricing_tiers` | JSON array `{ minQty, maxQty, unitPrice, label }` |

`maxQty: null` berarti tanpa batas atas dan hanya boleh dipakai tier terakhir. Meta dapat dibaca sebagai JSON string atau array/object hasil parse WooCommerce. Detail lengkap ada di [quantity-pricing.md](quantity-pricing.md).

## Upload GLB

Task A3 mengunggah GLB dari Ofissio Admin ke bucket privat Supabase. WooCommerce menyimpan bucket/key dan URL resolver, bukan signed URL permanen. Format legacy `/3d/*.glb` tetap didukung agar KK-006 tidak berubah.

## Aturan stok standar

`stock_status` WooCommerce tidak menjadi blocker customer-facing untuk produk standar. Produk standar tetap bisa tampil dan dipesan jika metadata Ofissio valid, termasuk saat stok fisik rendah/kosong di WooCommerce. Kekurangan stok ditangani sebagai warning internal `Replenishment needed` di Ofissio Admin, bukan pesan `stok habis` ke customer.

## Validasi product readiness A2.6

Ofissio hanya menampilkan produk WooCommerce jika semua ini valid:

- product status `publish`;
- SKU tidak kosong;
- minimal satu category dipilih;
- harga dasar lebih dari 0;
- `has_3d_model=true`;
- `model_3d_url` berupa `.glb` valid atau endpoint resolver signed URL internal;
- `model_3d_filename` berakhiran `.glb`;
- `model_3d_id`, `model_3d_version`, dan `model_3d_source` terisi;
- `moq`, `lead_time`, `fulfillment_type`, `transaction_mode`, dan `industries` terisi valid;
- minimal satu industri dipilih.

Field berikut hanya warning dan tidak memblokir produk: deskripsi panjang, foto tambahan, atribut warna/bahan/ukuran, quantity pricing tiers, metadata embroidery pricing lama, dukungan bordir, dan zona bordir.

Admin dapat melihat semua produk—termasuk yang belum valid—di `/admin/products`. Customer catalog dan Ofistant hanya menerima produk yang lolos seluruh field blocking.

Jalankan `npm run check:woocommerce` untuk memeriksa koneksi, jumlah produk valid, dan ringkasan field blocking maksimal lima produk invalid.

## Legacy embroidery pricing metadata

| Meta key | Format | Keterangan |
| --- | --- | --- |
| `embroidery_pricing_enabled` | boolean | Legacy; dipertahankan dan diabaikan calculator baru |
| `embroidery_pricing_mode` | `flat_per_piece` | Legacy; dipertahankan untuk kompatibilitas |
| `embroidery_pricing` | JSON array | Legacy; bukan source of truth |

Harga aktif dibaca dari master Supabase `embroidery_pricing_zones`. Meta lama hanya menghasilkan warning deprecation dan bukan blocking catalog field. Order sync membawa `ofissio_embroidery_total`, `ofissio_embroidery_zones`, `ofissio_customization_total`, dan `ofissio_pricing_source=ofissio` agar WooCommerce tidak menghitung ulang customization.
