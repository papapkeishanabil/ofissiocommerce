# Phase 21 — Resend Email Live / Staging Activation

Phase 21 menyiapkan email transactional staging menggunakan Resend secara aman. Ini bukan production deployment.

## Implemented

- Resend provider server-side hardened.
- `check:email` tersedia.
- `check:all` menjalankan `check:email` dan tetap aman di mode mock.
- Email config memvalidasi:
  - `EMAIL_PROVIDER`
  - `EMAIL_ENABLED`
  - `RESEND_API_KEY`
  - `EMAIL_FROM`
  - `EMAIL_REPLY_TO`
  - `SALES_QUOTATION_EMAIL`
- Quotation submit mengirim/log:
  - `quotation_request_sales`
  - `quotation_confirmation_customer`
- Admin `send_quote_to_customer` mengirim/log:
  - `quotation_ready_customer`
- Email failure tidak membatalkan quotation/order flow.
- `/api/email/test` dan `/api/admin/email/test` memakai internal guard.
- Legacy customer-triggered `/api/quotation/email` dinonaktifkan.
- Admin quotation detail menampilkan email delivery status dan last email log summary.
- `email_logs` tetap persistent melalui repository Supabase/mock.

## Validation commands

```bash
npm run check:env
npm run check:supabase
npm run check:storage
npm run check:woocommerce
npm run check:email
npm run typecheck
npm run lint
npm run build
npm run check:all
npm run verify:supabase-persistence
npm run test:company-isolation
```

## Live staging test

Set env staging:

```env
EMAIL_PROVIDER=resend
EMAIL_ENABLED=true
RESEND_API_KEY=
EMAIL_FROM="Ofissio <quotation@ofissio.com>"
EMAIL_REPLY_TO=sales@ofissio.com
SALES_QUOTATION_EMAIL=sales@ofissio.com
```

Then:

```bash
EMAIL_TEST_SEND=true npm run check:email
```

## Security notes

- `RESEND_API_KEY` tidak boleh masuk Git.
- Jangan buat `NEXT_PUBLIC_RESEND_API_KEY`.
- Resend provider tidak boleh diimport Client Component.
- Customer tidak bisa trigger arbitrary email.
- Admin email test/action harus memakai internal guard.
- Email logs tidak menyimpan secret atau raw provider response.

## Known limitation

- Resend live send skipped jika API key/domain belum siap.
- PDF quotation belum ada.
- Attachment email belum aktif.
- Marketing/newsletter/mass email tidak termasuk.
- Auth admin/customer masih mock.
- Payment/shipping tetap mock/manual.
- WooCommerce live belum aktif.
- Monitoring provider belum aktif.
