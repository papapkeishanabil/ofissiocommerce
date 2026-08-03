# Hostinger SMTP email

Ofissio mendukung `mock`, `resend`, dan `smtp`. Gunakan provider `smtp` untuk mengirim email live melalui mailbox Hostinger tanpa Resend API key. Semua credential SMTP hanya dibaca di server.

## Mengambil setting dari Hostinger

1. Masuk ke hPanel Hostinger lalu buka **Emails**.
2. Pilih domain dan mailbox pengirim, misalnya `noreply@ofissio.com`.
3. Buka **Connect Apps & Devices** atau **Configuration Settings**.
4. Catat outgoing server SMTP, port, dan jenis enkripsi.
5. Buat/reset password mailbox atau application password jika tersedia.

Hostinger umumnya memakai `smtp.hostinger.com`, port `465` dengan SSL/TLS. Port `587` dapat dipakai dengan STARTTLS (`SMTP_SECURE=false`). Selalu ikuti nilai terbaru yang tampil di hPanel.

## Environment staging

```env
EMAIL_PROVIDER=smtp
EMAIL_ENABLED=true

SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@ofissio.com
SMTP_PASSWORD=isi_dari_secret_manager

EMAIL_FROM="Ofissio <noreply@ofissio.com>"
EMAIL_REPLY_TO=sales@ofissio.com
SALES_QUOTATION_EMAIL=sales@ofissio.com

ORDER_NOTIFICATION_EMAIL_ENABLED=true
ORDER_NOTIFICATION_EMAILS=admin@ofissio.com,sales@ofissio.com

EMAIL_TEST_SEND=false
EMAIL_TEST_TO=email-test@domain.com
```

Jangan memakai `NEXT_PUBLIC_SMTP_PASSWORD`. Jangan commit `.env.local`. Simpan password asli di environment/secret manager staging.

Sebelum mengirim email live, jalankan migration `database/migrations/013_smtp_email_provider.sql` agar `email_logs` menerima provider `smtp` dan type `order_created_internal`.

## Test email internal

1. Isi env SMTP dan restart server.
2. Jalankan `npm run check:email` dengan `EMAIL_TEST_SEND=false` untuk validasi tanpa kirim.
3. Ubah sementara `EMAIL_TEST_SEND=true`, pastikan `EMAIL_TEST_TO` adalah inbox staging yang disetujui, lalu jalankan `npm run check:email` sekali.
4. Kembalikan `EMAIL_TEST_SEND=false`.
5. Buka `/admin/settings/email`, periksa provider SMTP dan log `sent`.
6. Tombol **Send Test Email** hanya dapat dipakai role `super_admin` atau `sales` dan dibatasi tiga request per sepuluh menit.

## Test quotation email

1. Buat quotation staging dengan email customer test.
2. Admin mengubah status menjadi quoted dan mengirim quotation.
3. Pastikan customer menerima email, link `/quotes/[id]` benar, dan `email_logs` berstatus `sent` dengan provider `smtp`.
4. Jangan memakai alamat customer nyata saat smoke test.

## Test order notification

1. Pastikan `ORDER_NOTIFICATION_EMAIL_ENABLED=true` dan penerima internal valid.
2. Accept lalu convert quotation staging menjadi order.
3. Pastikan email `Order Baru Masuk` diterima penerima internal.
4. Pastikan notification menyimpan `email_status=sent` dan `email_logs.type=order_created_internal`.
5. Retry convert tidak boleh mengirim email kedua.

## Troubleshooting

- **SMTP auth gagal**: pastikan username adalah alamat mailbox penuh dan password adalah password mailbox/application password, bukan password hPanel.
- **Port 465/587**: port 465 memakai `SMTP_SECURE=true`; port 587 biasanya memakai `SMTP_SECURE=false` agar STARTTLS dapat dinegosiasikan.
- **Password salah**: reset password mailbox, perbarui secret server, lalu restart aplikasi. Jangan tempel password ke log atau screenshot.
- **Email masuk spam**: verifikasi SPF, DKIM, dan DMARC domain; hindari sender yang berbeda dari mailbox SMTP; periksa reputasi dan isi email.
- **Sender/reply-to salah**: `EMAIL_FROM` sebaiknya memakai mailbox/domain terautentikasi. `EMAIL_REPLY_TO` boleh diarahkan ke sales selama alamat valid.
- **Timeout/network**: pastikan hosting mengizinkan outbound SMTP ke port yang dipilih dan DNS `smtp.hostinger.com` dapat diakses.
- **Email terkirim tetapi log gagal**: pastikan migration 013 sudah diterapkan dan Supabase terhubung.

## Checklist sebelum production

- Domain sender, SPF, DKIM, dan DMARC valid.
- Credential berada di secret manager, bukan Git/client bundle.
- Migration 013 sudah diterapkan.
- Test internal, quotation, dan order notification staging diterima.
- Reply-to sudah diuji dengan balasan nyata.
- Rate limit dan RBAC endpoint test email tervalidasi.
- Bounce/spam/delivery monitoring memiliki owner.
- `EMAIL_TEST_SEND=false` setelah smoke test.