# Resend Live Email

Task B menyiapkan pengiriman email staging melalui Resend untuk test internal,
quotation customer, dan notifikasi order internal. Credential selalu dibaca di
server dan tidak pernah dikirim ke browser.

## 1. Membuat API key

1. Masuk ke dashboard Resend.
2. Buat API key dengan akses kirim email untuk environment staging.
3. Simpan key di secret manager atau `.env.local`; jangan masukkan ke Git.
4. Jangan membuat `NEXT_PUBLIC_RESEND_API_KEY`.

## 2. Verifikasi domain dan sender

Tambahkan domain pengirim di Resend, pasang record DNS yang diminta, lalu tunggu
status verified. `EMAIL_FROM` harus menggunakan alamat pada domain tersebut.
Verifikasi domain hanya mengaktifkan pengiriman keluar; siapkan mailbox atau
forwarding terpisah untuk alamat `EMAIL_REPLY_TO`.

Jika akun masih dalam sandbox/restricted mode, gunakan recipient yang diizinkan
Resend sebagai `EMAIL_TEST_TO`. Build tidak melakukan pengiriman otomatis.

## 3. Environment staging

```env
EMAIL_PROVIDER=resend
EMAIL_ENABLED=true
EMAIL_FROM="Ofissio <noreply@domain-terverifikasi>"
EMAIL_REPLY_TO=sales@domain-terverifikasi
RESEND_API_KEY=
SALES_QUOTATION_EMAIL=sales@domain-terverifikasi
ORDER_NOTIFICATION_EMAIL_ENABLED=true
ORDER_NOTIFICATION_EMAILS=sales@domain-terverifikasi,admin@domain-terverifikasi
EMAIL_TEST_SEND=false
EMAIL_TEST_TO=email-test-yang-diizinkan@domain.com
```

`EMAIL_TEST_SEND=false` adalah default aman. Ubah menjadi `true` hanya untuk satu
pengujian eksplisit, jalankan `npm run check:email`, lalu kembalikan ke `false`.

## 4. Test email internal

1. Buka `/admin/settings/email` sebagai `super_admin` atau `sales`.
2. Pastikan provider requested `resend`, status enabled, dan Resend configured.
3. Isi penerima test bila perlu lalu klik **Send Test Email**.
4. Periksa inbox dan bagian **Email logs terbaru**.

Endpoint yang digunakan adalah `POST /api/admin/email/test`. Endpoint memakai
RBAC, validasi alamat email, safe error, dan rate limit tiga request per sepuluh
menit per admin/IP.

## 5. Test quotation email

1. Buat quotation dari produk valid.
2. Admin review dan finalkan pricing.
3. Pilih mark quoted/send quotation.
4. Pastikan customer menerima subject quotation, nomor quotation, total final,
   dan link `/quotes/[id]`.
5. Pastikan log bertipe `quotation_ready_customer` berstatus `sent`.

## 6. Test order notification email

1. Customer menerima quotation.
2. Admin convert quotation menjadi order.
3. Notification `order_created` dibuat satu kali.
4. Penerima `ORDER_NOTIFICATION_EMAILS` menerima subject
   `Order Baru Masuk - {orderNumber}`.
5. Retry convert tidak boleh membuat notification atau email kedua.

## 7. Membaca email logs

Admin berizin dapat melihat 20 log terbaru di `/admin/settings/email`. Log
menampilkan provider, recipient, subject, status, related entity, dan waktu.
Supabase table `email_logs` juga menyimpan `provider_message_id`, safe error,
serta metadata yang sudah difilter. API key atau raw provider payload tidak
disimpan.

## 8. Troubleshooting

- **Domain belum verified:** selesaikan DNS verification dan gunakan sender dari
  domain verified.
- **Email tidak diterima:** cek spam, sender, recipient, status log, dan dashboard
  Resend.
- **Recipient ditolak:** pada sandbox gunakan recipient yang diizinkan Resend.
- **Rate limited:** tunggu sepuluh menit sebelum mencoba kembali dari halaman
  admin.
- **API key salah:** ganti secret server; UI hanya menampilkan error aman.
- **Provider error:** detail sensitif tidak dikirim ke customer/browser. Gunakan
  status log dan server log yang sudah disanitasi.

## 9. Checklist sebelum production

- Domain/sender verified.
- Reply-to dapat menerima balasan.
- Test internal, quotation, dan order notification berstatus `sent`.
- Duplicate convert tidak mengirim email kedua.
- Bounce/failure monitoring memiliki owner.
- `RESEND_API_KEY` tidak ditemukan di `.next/static`.
- `.env.local` tidak tracked.
- `EMAIL_TEST_SEND=false` setelah smoke test.

Invoice/payment-ready email belum memiliki flow pengiriman live. Invoice PDF dan
payment panel sudah ada, tetapi aktivasi email tersebut menunggu Task C/iPaymu.
