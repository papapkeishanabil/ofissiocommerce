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
- `model_3d_url` wajib berakhiran `.glb`.
- `model_3d_filename` wajib berakhiran `.glb`.
- `model_3d_id`, `model_3d_version`, dan `model_3d_source` wajib ada.
- Produk tanpa SKU tidak valid.
- Produk tanpa GLB valid tidak tampil di katalog dan tidak bisa masuk cart.

## Field custom bordir

- `supports_embroidery`
- `embroidery_zones`
- `camera_presets`

Jika `supports_embroidery=true`, maka `embroidery_zones` wajib ada.

Nilai zona bordir yang didukung:

- `left_chest`
- `right_chest`
- `left_sleeve`
- `right_sleeve`
- `upper_back`
- `middle_back`

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

Contoh:

```json
["Corporate", "Perhotelan", "Security"]
```

atau:

```text
Corporate, Perhotelan, Security
```

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

## Upload GLB

Untuk Phase 8, GLB cukup berupa URL custom field. Ke depan, upload GLB final sebaiknya dilakukan melalui bridge plugin agar admin tidak perlu edit metadata manual.

## Validasi Phase 18

Ofissio hanya menampilkan produk WooCommerce jika semua ini valid:

- product status `publish`;
- SKU tidak kosong;
- `has_3d_model=true`;
- `model_3d_url` berakhiran `.glb`;
- `model_3d_filename` berakhiran `.glb`;
- `model_3d_id`, `model_3d_version`, dan `model_3d_source` terisi;
- jika `supports_embroidery=true`, maka `embroidery_zones` tidak kosong.

Jalankan `npm run check:woocommerce` untuk memeriksa koneksi dan jumlah produk WooCommerce yang valid GLB.
