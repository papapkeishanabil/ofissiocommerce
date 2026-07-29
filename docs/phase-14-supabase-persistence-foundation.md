# Phase 14 — Supabase Persistence + Staging Database Activation Foundation

## Status

Phase 14 menambahkan:

- Supabase admin database boundary server-only.
- Repository factory mock/Supabase.
- Supabase repository Priority 1 untuk quotation, email log, uploaded files, company logos.
- Foundation repository untuk order, payment, tracking, audit.
- `/api/health` dengan `databaseStatus`.
- Schema/migration readiness.
- Dokumentasi setup Supabase dan persistence strategy.

## Tidak dilakukan

- Tidak deploy production.
- Tidak menjalankan migration ke cloud DB.
- Tidak mengaktifkan iPaymu live.
- Tidak mengaktifkan shipping real.
- Tidak mengaktifkan WooCommerce live.
- Tidak menghapus mock fallback.

## Mock mode

Mock mode tetap default dan harus tetap lulus:

```env
DATABASE_PROVIDER=mock
STORAGE_PROVIDER=mock
```

## Supabase mode

Supabase mode hanya aktif jika env lengkap:

```env
DATABASE_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Jika env belum lengkap, runtime fallback aman ke mock.

## Known limitation

- Supabase Storage binary belum live.
- Cart persistence masih mock.
- Order/payment/tracking Supabase masih foundation.
- RLS policy belum diaktifkan otomatis.
- Live database smoke test diskip jika env Supabase tidak tersedia.
