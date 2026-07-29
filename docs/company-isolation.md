# Company isolation

Company isolation adalah aturan bahwa customer hanya boleh melihat dan mengubah data company sendiri.

## Prinsip

- `companyId` untuk data sensitif harus berasal dari server session.
- Request body/query frontend boleh dipakai sebagai hint pada mock mode, tetapi bukan sumber otoritatif production.
- Semua repository database wajib menerima scope `{ companyId, userId }` dari service/server context.
- Company mismatch harus mengembalikan safe `403` atau `404`.

## Area yang wajib scoped

- Checkout cart.
- Payment create/status/mock complete.
- Shipping rates/shipment/tracking.
- Tracking list/detail.
- Dashboard.
- Ofistant tracking.
- Repeat order.
- Audit log.
- Uploaded files/logo/artwork.
- Quotations dan quotation items.
- Email logs.

## Test manual

- Order company A tidak bisa dibuka company B.
- Payment company A tidak bisa dilihat company B.
- Tracking company A tidak bocor ke company B.
- Ofistant company B tidak membuka order company A.
- Repeat order company B tidak bisa copy order company A.
- Quotation company A tidak bisa dibuka company B.
- File/logo company A tidak bisa dipakai company B.

## Current Phase 14 behavior

Security helper `requireCompanyAccess()` tetap menjadi enforcement utama. API yang sudah memakai auth guard mulai meneruskan scope session ke service call setelah akses company diverifikasi.

Repository Supabase Priority 1 juga menerima `companyId` dari service/server context dan menambahkan filter `company_id`. Production nanti harus mengganti mock hint dengan real server-side session/JWT.
