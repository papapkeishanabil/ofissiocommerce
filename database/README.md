# Ofissio database drafts

Folder ini berisi draft schema dan seed development untuk Supabase Postgres/Postgres.

Phase 11 belum menjalankan migration ke cloud dan belum mengaktifkan database production. Default aplikasi tetap `DATABASE_PROVIDER=mock`.

## File

- `schema.sql`: draft schema persistent untuk company, users, carts, orders, payments, shipments, tracking, uploaded files, dan audit logs.
- `seed-dev.sql`: seed demo non-production tanpa password/secret real.

## Cara pakai nanti di Supabase staging

1. Buat project Supabase staging.
2. Buka SQL Editor.
3. Jalankan `schema.sql`.
4. Jalankan `seed-dev.sql`.
5. Isi env staging di dashboard hosting.
6. Jalankan smoke test staging.

Jangan jalankan ke production sebelum auth, RLS policy, backup, dan migration workflow final.
