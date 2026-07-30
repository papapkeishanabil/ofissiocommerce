# Resend setup

Gunakan dokumen ini untuk aktivasi email transactional staging Ofissio. Jangan gunakan untuk production launch sebelum seluruh checklist production selesai.

## Langkah setup

1. Buat akun Resend.
2. Buka menu API Keys.
3. Buat API key server-side untuk staging.
4. Verifikasi domain `ofissio.com` atau subdomain khusus email.
5. Tambahkan DNS record yang diminta Resend.
6. Isi env staging lewat secret manager, bukan commit Git.

```env
EMAIL_PROVIDER=resend
EMAIL_ENABLED=true
RESEND_API_KEY=
EMAIL_FROM="Ofissio <quotation@ofissio.com>"
EMAIL_REPLY_TO=sales@ofissio.com
SALES_QUOTATION_EMAIL=sales@ofissio.com
```

## DNS readiness

Cek di DNS provider:

- SPF: record TXT yang mengizinkan Resend mengirim atas nama domain.
- DKIM: record TXT/CNAME dari Resend untuk signature domain.
- DMARC: minimal policy monitoring, misalnya `p=none` untuk staging awal.

Tunggu status domain verified di Resend sebelum `EMAIL_ENABLED=true`.

## Mailbox/forwarding

`quotation@ofissio.com` sebagai `EMAIL_FROM` perlu mailbox atau forwarding jika Ofissio ingin menerima balasan customer. Domain verified hanya mengizinkan outbound sending; itu tidak otomatis membuat inbox.

## Test staging

```bash
npm run check:email
EMAIL_TEST_SEND=true npm run check:email
```

Lalu test flow aplikasi:

1. Submit quotation dari customer.
2. Cek email ke `SALES_QUOTATION_EMAIL`.
3. Cek confirmation email ke customer/PIC.
4. Admin update pricing dan klik `Send quote to customer`.
5. Cek `email_logs` status `sent` dan `providerMessageId`.

## Security

- Jangan commit `RESEND_API_KEY`.
- Jangan membuat `NEXT_PUBLIC_RESEND_API_KEY`.
- Jangan print API key di log.
- Jangan simpan raw provider payload sensitif di `email_logs`.
- Pastikan `.env.local` tidak tracked.

## Troubleshooting

- Domain belum verified: cek DNS propagation dan record Resend.
- Sender tidak valid: pastikan `EMAIL_FROM` memakai domain verified.
- API key salah: buat ulang key staging dan restart app.
- Email masuk spam: cek SPF/DKIM/DMARC dan reputasi domain.
- Rate limit: ulang test setelah jeda, jangan pakai endpoint test untuk mass email.
- Provider error: aplikasi hanya menampilkan safe error; cek server log dan dashboard Resend.

## Rollback

```env
EMAIL_PROVIDER=mock
EMAIL_ENABLED=false
```

Restart app. Quotation tetap tersimpan, email real berhenti dikirim.
