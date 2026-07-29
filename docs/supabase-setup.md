# Supabase setup plan

Supabase belum wajib aktif pada Phase 14. Dokumen ini menjelaskan setup staging manual tanpa production launch.

## Membuat project

1. Buat project Supabase staging.
2. Simpan database password di secret manager.
3. Ambil project URL dan anon key.
4. Ambil service role key hanya untuk server-side environment.
5. Jangan menyalin credential ke repo atau dokumen.

## Env

```bash
DATABASE_PROVIDER=supabase
AUTH_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AUTH_SESSION_COOKIE_NAME=ofissio_session
```

Anon key boleh public untuk client auth. Service role key tidak boleh muncul di client bundle.

Untuk storage metadata + future Supabase Storage:

```bash
STORAGE_PROVIDER=supabase
STORAGE_BUCKET_LOGOS=ofissio-logos
STORAGE_BUCKET_ARTWORK=ofissio-artwork
STORAGE_BUCKET_DOCUMENTS=ofissio-documents
STORAGE_BUCKET_3D=ofissio-3d-models
```

## Menjalankan schema

1. Buka Supabase SQL Editor.
2. Jalankan `database/schema.sql`.
3. Jalankan `database/seed-dev.sql` untuk staging demo, bukan production.
4. Verifikasi tabel dan index terbentuk.
5. Jalankan `/api/health` dan pastikan `databaseStatus` menjadi `connected`.

## RLS plan

Aktifkan RLS setelah session/JWT claim company final:

- customer hanya akses company sendiri;
- internal role akses sesuai permission;
- uploaded files dan audit logs tetap company-scoped;
- service role hanya untuk server route yang memang butuh privileged operation.
- storage bucket customer sebaiknya private; akses file lewat signed URL setelah company scope tervalidasi.

## Checklist staging

- `/api/health` menampilkan provider sesuai env.
- Secret service role tidak ada di browser.
- Company mismatch quotation/file/payment/tracking ditolak.
- Quotation, email log, uploaded file metadata, dan company logo tersimpan.
- Cart/order/payment/tracking repository migrasi bertahap.
- Backup/restore staging diuji sebelum production.
