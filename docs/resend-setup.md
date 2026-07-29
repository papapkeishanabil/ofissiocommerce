# Resend setup

Gunakan dokumen ini saat Ofissio siap mengirim email quotation real.

## Langkah

1. Buat akun Resend.
2. Verify domain pengirim, misalnya `ofissio.com`.
3. Buat API key untuk server.
4. Isi env hosting:

```env
EMAIL_PROVIDER=resend
EMAIL_ENABLED=true
RESEND_API_KEY=...
EMAIL_FROM="Ofissio <quotation@ofissio.com>"
EMAIL_REPLY_TO=sales@ofissio.com
SALES_QUOTATION_EMAIL=sales@ofissio.com
```

5. Restart app.
6. Jalankan:

```bash
npm run check:env
```

7. Test `POST /api/email/test` di staging.
8. Test request quotation dari cart.

## Security

- Jangan commit `RESEND_API_KEY`.
- Jangan membuat `NEXT_PUBLIC_RESEND_API_KEY`.
- `EMAIL_FROM` harus domain verified.
- `SALES_QUOTATION_EMAIL` harus inbox/forwarding internal yang aktif.

## Rollback aman

Jika email real bermasalah:

```env
EMAIL_PROVIDER=mock
EMAIL_ENABLED=false
```

Setelah restart, quotation tetap tercatat tetapi email real tidak dikirim.
