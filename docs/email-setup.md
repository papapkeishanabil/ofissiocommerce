# Email / Resend setup

Ofissio membutuhkan transactional email untuk notifikasi quotation, follow-up sales, dan nanti status order/payment.

## Env

```bash
EMAIL_PROVIDER=resend
RESEND_API_KEY=
EMAIL_FROM="Ofissio <quotation@ofissio.com>"
SALES_QUOTATION_EMAIL=
```

Jangan pakai `NEXT_PUBLIC_RESEND_API_KEY` dan jangan commit `RESEND_API_KEY`.

## Resend API key

1. Login ke dashboard Resend.
2. Buat API key untuk project Ofissio.
3. Simpan key di secret manager hosting staging/production.
4. Jangan copy key ke docs, Git, screenshot, atau chat.

## Verifikasi domain

Untuk production, `EMAIL_FROM` harus memakai domain yang sudah diverifikasi di Resend, misalnya `quotation@ofissio.com`.

DNS yang perlu disiapkan nanti:

- SPF.
- DKIM.
- DMARC.

Record final mengikuti dashboard Resend karena nilainya domain-specific.

## Mailbox / reply

`quotation@ofissio.com` bisa dipakai sebagai sender setelah domain verified. Agar customer reply terbaca, tetap siapkan mailbox atau forwarding ke sales.

## Staging test email

- Isi `RESEND_API_KEY` staging di dashboard hosting.
- Isi `SALES_QUOTATION_EMAIL` dengan email internal test.
- Kirim request quotation.
- Pastikan email diterima.
- Pastikan tidak ada API key di response/browser bundle.

## Production test email

- Domain sender verified.
- `EMAIL_FROM` memakai domain production.
- Test quotation dari production dengan data dummy terkontrol.
- Pastikan delivery, reply, dan spam placement dicek.
