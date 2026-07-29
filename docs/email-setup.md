# Email setup

Phase 13 menambahkan fondasi email production dengan provider abstraction.
Default aman adalah mock, sehingga development dan staging awal tidak mengirim email real.

## Env

```env
EMAIL_PROVIDER=mock
EMAIL_ENABLED=false
EMAIL_FROM="Ofissio <quotation@ofissio.com>"
EMAIL_REPLY_TO=
SALES_QUOTATION_EMAIL=
RESEND_API_KEY=
```

Untuk Resend real:

```env
EMAIL_PROVIDER=resend
EMAIL_ENABLED=true
RESEND_API_KEY=
EMAIL_FROM="Ofissio <quotation@your-domain.com>"
EMAIL_REPLY_TO=sales@your-domain.com
SALES_QUOTATION_EMAIL=sales@your-domain.com
```

## Provider

- `mock`: tidak mengirim email, hanya membuat `email_logs` in-memory dan audit log.
- `resend`: mengirim server-side via Resend API.

`RESEND_API_KEY` tidak boleh memakai prefix `NEXT_PUBLIC_`.

## Endpoint test

`POST /api/email/test`

- Aktif hanya untuk non-production.
- Tetap butuh auth mock header dan role yang boleh request quotation.
- Body opsional:

```json
{ "to": "sales@example.com" }
```

Jika `EMAIL_PROVIDER=mock`, response akan berstatus `mocked`.

## Template awal

- Sales notification: `quotation_request_sales`.
- Customer confirmation: `quotation_confirmation_customer`.
- Skeleton future: payment received, tracking update.

Known limitation: log email saat ini masih in-memory; production persistence menunggu database provider live.
