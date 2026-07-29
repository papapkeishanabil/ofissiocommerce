# Storage upload foundation

Phase 12 menambahkan storage abstraction untuk file customer seperti logo, artwork, quotation attachment, invoice, PO, snapshot 3D, dan future GLB admin.

## Provider

Default:

```bash
STORAGE_PROVIDER=mock
```

Provider yang disiapkan:

- `mock`: aktif default, menyimpan metadata dan object bytes sementara di memory server.
- `supabase`: boundary server-side, fallback aman ke mock jika env Supabase belum lengkap.
- `s3`: boundary interface untuk S3-compatible/R2, belum live.

## API

- `POST /api/files/upload`
- `GET /api/files`
- `GET /api/files/[id]`
- `GET /api/files/[id]/signed-url`
- `DELETE /api/files/[id]`

Semua endpoint wajib auth/session dan company-scoped. Client tidak boleh mengirim file mentah ke checkout; checkout hanya menerima `logoFileId` yang sudah tersimpan.

## File types

| File type | Bucket | Format |
| --- | --- | --- |
| `company_logo` | logos | png, jpg, jpeg, svg |
| `embroidery_logo` | logos | png, jpg, jpeg, svg |
| `artwork` | artwork | png, jpg, jpeg, svg, pdf |
| `quotation_attachment` | documents | pdf, xlsx, png, jpg, jpeg |
| `invoice_document` | documents | pdf, xlsx, png, jpg, jpeg |
| `purchase_order_document` | documents | pdf, xlsx, png, jpg, jpeg |
| `3d_snapshot` | artwork | png, jpg, jpeg |
| `product_glb_admin_future` | 3D | glb |

## Security rules

- Storage key generated server-side.
- Storage key includes company id and file type.
- Original filename is only metadata/display.
- Extension, MIME, and size are allowlisted.
- Error response is safe and does not expose stack trace.
- Upload success/fail is audit logged.
- SVG is marked `requiresSvgSanitization`.
- Antivirus scan remains TODO/foundation.

## Mock limitation

Mock storage is in-memory. Uploaded files reset when the dev server restarts.
