# Phase 17 - Quotation Management + Convert to Order Foundation

## Scope selesai

- Quotation model diperluas untuk pricing, notes, valid until, customer message, accepted/rejected timestamp, dan converted order id.
- Migration draft `database/migrations/003_quotation_management.sql` dibuat.
- Repository mock/Supabase diperluas untuk status, pricing, notes, events, accept/reject, dan conversion.
- Admin quotation detail punya pricing editor, internal note, send quote, dan convert-to-order action.
- Customer quotation detail menampilkan harga final hanya setelah `quoted`.
- Customer dapat accept/reject/request revision lewat API company-scoped.
- Convert quotation membuat order, payment mock, tracking initial, audit log, dan quotation event.
- Order hasil convert muncul di admin/customer tracking via repository-backed tracking API.
- Email quote-ready customer menggunakan email foundation.

## Migration

Migration 003 tidak dijalankan otomatis. Jalankan manual di Supabase SQL Editor saat staging siap.

Sebelum migration dijalankan, app tetap berjalan karena data canonical Phase 17 disimpan di `quotation_json`.

## Security

- Admin action wajib internal guard.
- Customer action wajib session + company scope.
- Internal notes tidak dikirim ke customer endpoint.
- Server menghitung ulang total pricing.
- Convert idempotent menggunakan `convertedOrderId`.
- Supabase service role tetap server-side.

## Known limitation

- WooCommerce live order sync belum aktif.
- PDF quotation belum dibuat.
- Payment tetap mock.
- Shipping tetap mock/manual.
- Admin auth masih mock.
- Supabase Storage live belum aktif.
- Monitoring provider belum aktif.
- npm audit vulnerabilities belum diperbaiki.
