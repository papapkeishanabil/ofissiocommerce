# Supabase Storage setup

Phase 12 belum mengaktifkan Supabase Storage live. Dokumen ini adalah checklist setup staging.

## Bucket yang dibutuhkan

- `ofissio-logos`
- `ofissio-artwork`
- `ofissio-documents`
- `ofissio-3d-models`

Gunakan private bucket untuk file customer production.

## Env

```bash
STORAGE_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STORAGE_BUCKET_LOGOS=ofissio-logos
STORAGE_BUCKET_ARTWORK=ofissio-artwork
STORAGE_BUCKET_DOCUMENTS=ofissio-documents
STORAGE_BUCKET_3D=ofissio-3d-models
STORAGE_SIGNED_URL_EXPIRES_SECONDS=3600
```

`SUPABASE_SERVICE_ROLE_KEY` hanya boleh server-side. Jangan pernah membuat `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`.

## Signed URL plan

- File customer private.
- UI meminta signed URL lewat `/api/files/[id]/signed-url`.
- API mengecek session/company scope sebelum signed URL dibuat.
- Default expiry: 3600 detik.

## Storage/RLS policy draft

- Metadata file ada di tabel `uploaded_files`.
- `company_logos` merujuk ke `uploaded_files`.
- RLS wajib filter `company_id`.
- Storage object path wajib mengandung company id dan file type.

## Allowlist

- Logo: png, jpg, jpeg, svg.
- Dokumen: pdf, xlsx, png, jpg, jpeg.
- Snapshot: png, jpg, jpeg.
- Future GLB admin: glb.

## TODO sebelum live

- Implement SDK Supabase Storage server-side.
- Sanitasi SVG.
- Antivirus scan.
- Retention policy file rejected/deleted.
- Test restore backup metadata + object.

## Cara test staging

1. Set `STORAGE_PROVIDER=supabase`.
2. Isi env Supabase.
3. Jalankan `npm run check:env`.
4. Upload logo kecil.
5. Pastikan list logo muncul.
6. Pastikan company mismatch tidak mendapat signed URL.
