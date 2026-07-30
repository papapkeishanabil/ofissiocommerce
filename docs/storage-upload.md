# Storage upload

Phase 20 menyediakan live storage foundation untuk file customer/ofissio.

## Provider

- `mock`: default aman; object binary hanya memory server dan hilang saat restart.
- `supabase`: live private storage via Supabase Storage server-side.
- `s3`: boundary future, belum live.

## API

- `POST /api/files/upload`
- `GET /api/files`
- `GET /api/files/[id]`
- `GET /api/files/[id]/signed-url`
- `DELETE /api/files/[id]`

Semua endpoint customer wajib auth/session, role check, rate limit, Zod validation, company scope, dan safe error response. Client tidak boleh dipercaya untuk `companyId`; scope berasal dari session/header server context.

## File type routing

| File type | Bucket purpose | Default bucket |
| --- | --- | --- |
| `company_logo` | logos | `ofissio-logos` |
| `embroidery_logo` | logos | `ofissio-logos` |
| `artwork` | artwork | `ofissio-artwork` |
| `quotation_attachment` | documents | `ofissio-documents` |
| `invoice_document` | documents | `ofissio-documents` |
| `purchase_order_document` | documents | `ofissio-documents` |
| `3d_snapshot` | artwork | `ofissio-artwork` |
| `product_glb_admin_future` | 3D | `ofissio-3d-models` |

Phase 20 tidak mengaktifkan upload GLB admin penuh dan tidak memindahkan `KK-006`.

## Storage key

Storage key dibuat server-side dengan pola:

```text
{companyId}/{fileType}/{yyyy}/{mm}/{randomId}.{ext}
```

Original filename hanya metadata display. Storage key tidak ditampilkan ke customer UI.

## Metadata

Metadata utama:

- `uploaded_files`
- `company_logos` untuk logo company/embroidery

Jika migration `006_storage_live.sql` sudah dijalankan, `uploaded_files.storage_provider` akan terisi `mock`/`supabase`/`s3`. Sebelum migration dijalankan, aplikasi tetap fallback ke schema lama dan menyimpan provider di metadata JSON agar tidak merusak staging.

## Signed URL

Preview/download memakai signed URL dari:

```text
GET /api/files/[id]/signed-url
```

API mengecek ownership company sebelum meminta provider membuat signed URL. Supabase signed URL default expired dalam 3600 detik.
