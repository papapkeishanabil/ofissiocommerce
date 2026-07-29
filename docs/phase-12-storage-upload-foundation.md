# Phase 12 — Storage Upload + Logo/Artwork Foundation

Phase 12 menyiapkan fondasi upload/storage tanpa production storage launch.

## Yang dibuat

- Storage provider abstraction: mock, Supabase boundary, S3/R2 boundary.
- Upload validation berbasis helper security.
- Uploaded file model dan mock repository.
- API file upload/list/detail/signed-url/delete.
- Company logo library foundation.
- Dashboard section untuk upload/list/select/delete logo.
- Integrasi ringan Studio Bordir: preview lokal cepat, lalu upload API menyimpan `logoFileId`.
- Checkout backend memvalidasi `logoFileId` company-scoped jika ada.
- Draft SQL `uploaded_files` dan `company_logos` diperkuat.

## Env baru

```bash
STORAGE_PROVIDER=mock
STORAGE_BUCKET_LOGOS=ofissio-logos
STORAGE_BUCKET_ARTWORK=ofissio-artwork
STORAGE_BUCKET_DOCUMENTS=ofissio-documents
STORAGE_BUCKET_3D=ofissio-3d-models
STORAGE_SIGNED_URL_EXPIRES_SECONDS=3600
MAX_LOGO_UPLOAD_MB=10
MAX_DOCUMENT_UPLOAD_MB=20
MAX_GLB_UPLOAD_MB=100
```

## API

- `POST /api/files/upload`
- `GET /api/files`
- `GET /api/files/[id]`
- `GET /api/files/[id]/signed-url`
- `DELETE /api/files/[id]`
- `POST /api/company/logos`
- `GET /api/company/logos`
- `DELETE /api/company/logos/[id]`

## Company isolation

- Endpoint storage mengambil company dari session/header auth, bukan dari body.
- File list/detail/signed URL/delete hanya memakai `session.companyId`.
- Checkout menolak `logoFileId` yang tidak ditemukan di company yang sama.

## Hasil validasi lokal

- `npm run check:env`: pass.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.
- `npm run check:all`: pass.
- `/api/health`: 200, storage provider aktif `mock`.
- `/catalog`: 200 dan KK-006 tetap tampil.
- `/product/kemeja-kantor-kk-006`: 200 dan metadata `kk-006.glb` tetap tampil.
- `/3d/kk-006.glb`: 200.
- Upload logo valid via API: pass.
- Invalid extension, invalid MIME, dan file terlalu besar: ditolak 400 dengan safe response.
- File company A tidak muncul di list company B.
- Detail/signed-url/delete file company A oleh company B: tertolak 404.
- Cart dengan `logoFileId` company yang sama: pass.
- Cart dengan `logoFileId` beda company: ditolak 400.
- Payment mock success dari cart berlogo menghasilkan tracking record.
- Browser smoke desktop: dashboard logo library tampil, 3D canvas muncul, ESC menutup modal, cart menyimpan KK-006 + `/3d/kk-006.glb`.
- Browser smoke mobile: tidak ada horizontal overflow.
- Browser console: 0 error.
- Security scan: secret server-side/storage pattern tidak ditemukan di `.next/static`.

## Known limitation

- Mock storage masih memory server dan hilang saat restart.
- Supabase Storage belum aktif karena env/SDK belum dihubungkan.
- S3/R2 masih interface boundary.
- Signed URL mock berupa data URL.
- SVG sanitization masih TODO.
- Antivirus scan masih TODO.
- Private object storage belum dites live.
- Payment tetap mock.
- Shipping tetap mock/manual.
- WooCommerce live belum dites.
- Email production belum aktif.

## Tidak dilakukan

- Tidak deploy production.
- Tidak mengubah `/3d/kk-006.glb`.
- Tidak mengubah model GLB KK-006.
- Tidak mengaktifkan iPaymu live.
- Tidak mengaktifkan shipping provider real.
- Tidak menjalankan WooCommerce live test.
