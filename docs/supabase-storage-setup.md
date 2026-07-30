# Supabase Storage setup — Phase 20

Phase 20 mengaktifkan Supabase Storage sebagai private binary storage untuk logo, artwork, dokumen quotation, dan fondasi future GLB admin. Metadata tetap disimpan di `uploaded_files` dan `company_logos`.

## Required buckets

- `ofissio-logos`
- `ofissio-artwork`
- `ofissio-documents`
- `ofissio-3d-models`

Rekomendasi:

- Buat semua bucket di atas sebagai private bucket.
- Gunakan signed URL untuk preview/download.
- Public bucket hanya untuk asset yang memang aman dibuka publik.
- GLB produk customer/internal tetap private/admin-controlled.
- `/3d/kk-006.glb` tetap local public asset untuk sekarang dan tidak dipindah pada Phase 20.

## Manual setup checklist

1. Buka Supabase Dashboard.
2. Masuk ke Storage.
3. Klik Create bucket.
4. Buat bucket `ofissio-logos` sebagai private.
5. Buat bucket `ofissio-artwork` sebagai private.
6. Buat bucket `ofissio-documents` sebagai private.
7. Buat bucket `ofissio-3d-models` sebagai private/future.
8. Jangan upload secret ke bucket.
9. Jangan membuat semua bucket public tanpa alasan operasional yang jelas.

## Env staging/live

```bash
STORAGE_PROVIDER=supabase
STORAGE_BUCKET_LOGOS=ofissio-logos
STORAGE_BUCKET_ARTWORK=ofissio-artwork
STORAGE_BUCKET_DOCUMENTS=ofissio-documents
STORAGE_BUCKET_3D=ofissio-3d-models
STORAGE_SIGNED_URL_EXPIRES_SECONDS=3600
MAX_LOGO_UPLOAD_MB=10
MAX_DOCUMENT_UPLOAD_MB=20
MAX_GLB_UPLOAD_MB=100
```

Supabase env yang dibutuhkan:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` hanya boleh server-side. Jangan pernah membuat `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`.

## Validation

```bash
npm run check:storage
```

Mode `mock` akan pass dengan pesan skipped. Mode `supabase` akan mengecek bucket required. Write test tidak dilakukan kecuali:

```bash
STORAGE_TEST_WRITE=true npm run check:storage
```

Write test hanya upload file health-check kecil ke bucket logo lalu menghapusnya kembali. Jangan gunakan script ini untuk menghapus file customer.
