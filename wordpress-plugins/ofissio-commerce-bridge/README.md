# Ofissio Commerce Bridge

Skeleton WordPress plugin untuk Phase 8 WooCommerce Headless.

## Tujuan

- Menambahkan field Ofissio di WooCommerce Product Admin.
- Menyimpan metadata GLB dan bordir.
- Validasi produk sebelum publish.
- Menyediakan REST helper untuk integrasi Ofissio.

## Status Phase 8

Plugin ini masih skeleton. File ini sengaja tidak menjadi bagian dari build Next.js.

## Field yang akan dikelola

- `model_3d_url`
- `model_3d_id`
- `model_3d_version`
- `model_3d_source`
- `model_3d_filename`
- `has_3d_model`
- `embroidery_zones`
- `camera_presets`

## Instalasi manual

1. Copy folder `ofissio-commerce-bridge` ke `wp-content/plugins/`.
2. Aktifkan dari WordPress Admin.
3. Pastikan WooCommerce aktif.

## Endpoint skeleton

```text
GET /wp-json/ofissio/v1/health
```

## Phase 18 next hooks

Plugin ini nanti disarankan menambahkan:

- badge "Ofissio-ready" di WooCommerce product list;
- validasi publish untuk metadata GLB wajib;
- helper field untuk zones bordir dan camera presets;
- panel order meta yang menampilkan `ofissio_order_id`, `quotation_id`, dan status sync.
