# Phase 20 — Supabase Storage Live Activation

## Status

Phase 20 menyiapkan Supabase Storage provider live, check script, signed URL flow, logo library preview signed URL, admin uploads visibility, dan migration metadata readiness.

## Yang aktif

- `STORAGE_PROVIDER=mock` tetap pass.
- `STORAGE_PROVIDER=supabase` memakai Supabase Storage REST server-side.
- Required buckets dicek dengan `npm run check:storage`.
- Upload binary dilakukan sebelum metadata save.
- Jika metadata save gagal setelah upload object, aplikasi mencoba rollback delete object dan mencatat audit warning.
- Signed URL dibuat server-side dan company-scoped.
- Admin uploads menampilkan provider, bucket, file type, status, scan/sanitize status, dan action View via signed URL.

## Migration

Review dan jalankan manual jika ingin kolom Phase 20 penuh:

```text
database/migrations/006_storage_live.sql
```

Jangan apply otomatis dari Codex. Aplikasi backward-compatible dengan schema lama.

## Tidak termasuk Phase 20

- Production deployment.
- iPaymu live.
- Shipping provider real.
- WooCommerce live.
- Auth production final.
- Antivirus scan real.
- SVG sanitization penuh.
- Product GLB admin upload penuh.
- Perubahan `KK-006` atau `/3d/kk-006.glb`.

## Manual smoke

1. Pastikan `/api/health` connected/ready.
2. Jalankan `npm run check:storage`.
3. Jika provider mock: hasil skipped/pass sudah cukup untuk fallback.
4. Jika provider Supabase: pastikan semua bucket reachable.
5. Upload logo valid dari Logo Library.
6. Pastikan metadata `uploaded_files` dan `company_logos` tersimpan.
7. Buka Logo Library lagi; preview memakai signed URL.
8. Restart dev server; preview tetap tampil bila provider Supabase aktif.
9. Buka `/admin/uploads`; pastikan signed View tersedia atau warning aman.
10. Pastikan `/3d/kk-006.glb` tetap 200 dan 3D configurator tetap jalan.

## Known limitation

- Supabase buckets mungkin belum dibuat; `check:storage` akan melaporkan missing bucket.
- Live upload Supabase hanya bisa dibuktikan setelah `STORAGE_PROVIDER=supabase` dan bucket private dibuat.
- Antivirus scan dan SVG sanitization penuh masih TODO.
- Auth admin/customer masih mock foundation.
- Payment/shipping/WooCommerce/email real belum aktif.
