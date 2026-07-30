# Email setup

Phase 21 mengaktifkan fondasi email transactional staging dengan Resend, tetapi default aman tetap `mock`.

## Env mock

```env
EMAIL_PROVIDER=mock
EMAIL_ENABLED=false
RESEND_API_KEY=
EMAIL_FROM="Ofissio <quotation@ofissio.com>"
EMAIL_REPLY_TO=
SALES_QUOTATION_EMAIL=
```

Mode mock tidak mengirim email real. Aplikasi tetap membuat `email_logs` saat flow quotation mengirim notifikasi.

## Env Resend staging

```env
EMAIL_PROVIDER=resend
EMAIL_ENABLED=true
RESEND_API_KEY=
EMAIL_FROM="Ofissio <quotation@ofissio.com>"
EMAIL_REPLY_TO=sales@ofissio.com
SALES_QUOTATION_EMAIL=sales@ofissio.com
```

Aturan:

- `RESEND_API_KEY` hanya server-side.
- Jangan membuat `NEXT_PUBLIC_RESEND_API_KEY`.
- `EMAIL_FROM` harus memakai domain yang sudah verified di Resend.
- `EMAIL_REPLY_TO` opsional, tetapi wajib valid jika diisi.
- `SALES_QUOTATION_EMAIL` adalah penerima internal notifikasi quotation.

## Check dan test

```bash
npm run check:email
```

Jika `EMAIL_PROVIDER=mock`, hasilnya pass/skipped jelas. Jika `EMAIL_PROVIDER=resend` dan `EMAIL_ENABLED=true`, script memvalidasi `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, dan `SALES_QUOTATION_EMAIL`.

Real send tidak dilakukan otomatis. Untuk staging test eksplisit:

```bash
EMAIL_TEST_SEND=true npm run check:email
```

Test email dikirim ke `SALES_QUOTATION_EMAIL` dengan subject `[Ofissio Staging] Test Email` dan dicatat ke `email_logs`.

## Flow quotation

- Customer submit quotation:
  - `quotation_request_sales` ke `SALES_QUOTATION_EMAIL`.
  - `quotation_confirmation_customer` ke email customer/PIC jika ada.
- Admin `send_quote_to_customer`:
  - `quotation_ready_customer` ke customer.
- Jika quotation PDF Phase 22 sudah tersedia:
  - email menyebut PDF dapat diunduh melalui portal `/quotes/[id]`;
  - signed URL langsung tidak dikirim sebagai default agar tidak kadaluarsa di inbox.
- Email failure tidak membatalkan quotation/order flow.
- Customer response tidak menampilkan provider, raw error, internal notes, atau secret.

## Endpoint test

`POST /api/email/test` dan `POST /api/admin/email/test` hanya untuk internal admin/dev-staging.

- Wajib internal guard.
- Rate limited.
- Tidak aktif di production kecuali `EMAIL_TEST_ALLOW_PRODUCTION=true`.
- Tidak menerima `from` dari client.
- `to` harus valid jika dikirim.

## Rollback ke mock

```env
EMAIL_PROVIDER=mock
EMAIL_ENABLED=false
RESEND_API_KEY=
```

Restart server setelah mengubah env. Quotation tetap berjalan, email real tidak dikirim.

## Known limitation

- PDF quotation/invoice belum dilampirkan sebagai attachment; link portal menjadi default aman.
- Template email invoice ready baru foundation, belum live transactional penuh.
- Attachment logo/artwork belum dikirim via email.
- Marketing/newsletter/mass email tidak termasuk Phase 21.
- Auth customer/admin masih mock.
- Monitoring provider belum aktif.
