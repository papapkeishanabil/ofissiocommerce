# Phase 13 — Email Production Foundation + Quotation Notification

## Status

Phase 13 menambahkan foundation untuk:

- provider email `mock` dan `resend`,
- email log in-memory,
- template quotation sales dan customer,
- API quotation server-side,
- detail quotation company-scoped,
- dashboard quotation dari API,
- draft schema `quotations`, `quotation_items`, `email_logs`.

## File utama

- `src/features/email/*`
- `src/features/quotation/quotation.service.ts`
- `src/app/api/quotation/request/route.ts`
- `src/app/api/quotation/route.ts`
- `src/app/api/quotation/[id]/route.ts`
- `src/app/api/email/test/route.ts`

## Smoke test manual

1. Jalankan `npm run dev`.
2. Login/register mock.
3. Buka produk KK-006.
4. Tambahkan quantity minimal MOQ ke cart.
5. Jika perlu, upload logo dan simpan placement ke cart.
6. Buka `/quote`.
7. Isi catatan, klik `Kirim Request Quotation`.
8. Pastikan diarahkan ke `/quotes/[id]?new=1`.
9. Pastikan dashboard menampilkan quotation.
10. Pastikan `/api/health` menampilkan `emailProvider`.

## Security checks

- `RESEND_API_KEY` hanya dibaca server-side.
- `NEXT_PUBLIC_RESEND_API_KEY` ditolak oleh `scripts/check-env.ts`.
- API quotation mengambil company dari session/header, bukan dari body.
- Detail quotation menolak company lain.
- Error API memakai safe response tanpa stack trace.

## Known limitation

- Repository quotation dan email log masih in-memory.
- Email real butuh Resend domain verified.
- Quotation final/PDF/admin sales dashboard belum diaktifkan.
- Request quotation masih memakai cart local client sebagai input, lalu divalidasi ulang server.
