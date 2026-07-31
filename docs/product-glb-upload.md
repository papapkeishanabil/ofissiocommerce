# Product GLB Upload

## Validasi

- SKU harus sudah ada.
- Ekstensi hanya `.glb`.
- MIME yang diterima: `model/gltf-binary` atau `application/octet-stream`.
- Isi file harus memiliki magic header binary GLB `glTF`.
- Maksimum `MAX_GLB_UPLOAD_MB`, default 100 MB.
- Nama file dan versi disanitasi; `.txt`, `.zip`, `.exe`, `.js`, `.html`, dan `.svg` ditolak.

## Storage

Bucket privat: `STORAGE_BUCKET_3D`, default `ofissio-3d-models`.

Path:

```text
products/{sku-sanitized}/{version}/{filename-sanitized}.glb
```

Upload mengaktifkan upsert hanya untuk path versi yang sama. Jika metadata WooCommerce gagal diperbarui pada object baru, object tersebut dihapus sebagai rollback. Object yang sudah ada tidak dihapus agar reference aktif tidak menjadi 404.

## Metadata WooCommerce

- `has_3d_model=true`
- `model_3d_source=supabase`
- `model_3d_storage_bucket`
- `model_3d_storage_key`
- `model_3d_id={sku-lower}-{version}`
- `model_3d_version`
- `model_3d_filename`
- `model_3d_url=/api/products/woocommerce/{id}/3d-model/signed-url`

Permanent signed URL tidak disimpan. Endpoint publik resolver hanya bekerja untuk produk publish yang lolos readiness, menandatangani object saat runtime, dan hanya mengembalikan URL sementara serta waktu kedaluwarsa. Bucket, storage key, dan service-role key tidak ada dalam response customer.

## Known limitation

Task A3 belum memiliki version history UI atau cleanup otomatis untuk file versi lama dengan path berbeda. Penghapusan model lama harus dikelola manual sampai lifecycle management ditambahkan.
