# iPaymu sandbox payment test

Panduan ini dipakai untuk menguji payment link dan callback iPaymu pada
staging. Jangan menaruh VA, API key, signature, atau payload sensitif di Git,
log browser, screenshot publik, maupun variable `NEXT_PUBLIC_*`.

## 1. Environment sandbox

Simpan credential di `.env.local` (lokal) atau secret manager staging:

```env
PAYMENT_PROVIDER=ipaymu
PAYMENT_MODE=sandbox
IPAYMU_ENABLED=true
IPAYMU_MODE=sandbox
IPAYMU_BASE_URL=https://sandbox.ipaymu.com
IPAYMU_VA=<sandbox-va>
IPAYMU_API_KEY=<sandbox-api-key>
IPAYMU_NOTIFY_URL=https://staging.example.com/api/payment/ipaymu/callback
IPAYMU_RETURN_URL=https://staging.example.com/payment/return
IPAYMU_CANCEL_URL=https://staging.example.com/payment/cancel
IPAYMU_EXPIRE_MINUTES=1440
IPAYMU_TEST_CREATE_PAYMENT=false
```

`PAYMENT_MODE` dan `IPAYMU_MODE` harus sama. Credential sandbox dan live
disimpan sebagai secret deployment yang terpisah. Jangan menyalin credential
sandbox ke environment live atau sebaliknya.

## 2. Public callback URL

iPaymu tidak dapat memanggil `localhost`. Gunakan salah satu:

- domain staging HTTPS; atau
- tunnel HTTPS sementara yang meneruskan request ke port 8000.

Isi URL publik tersebut pada `IPAYMU_NOTIFY_URL` dan pada pengaturan callback
dashboard iPaymu. Return/cancel URL hanya untuk navigasi browser dan tidak
pernah menjadi bukti pembayaran lunas.

## 3. Validasi tanpa transaksi nyata

```bash
npm run check:env
npm run check:payment
```

Secara default `check:payment` menjalankan smoke terisolasi: payload create
memakai grand total backend, callback paid valid, duplicate callback, invalid
signature, amount mismatch, unknown status, serta return/cancel read-only.
Script tidak menghubungi sandbox selama `IPAYMU_TEST_CREATE_PAYMENT=false`.

## 4. Membuat satu payment link sandbox

Set sementara:

```env
IPAYMU_TEST_CREATE_PAYMENT=true
```

Lalu jalankan `npm run check:payment`. Script menolak create nyata jika mode
bukan sandbox. Setelah link test terbentuk, kembalikan flag ke `false`.

Untuk flow order sebenarnya, buka order valid yang belum lunas di Ofissio
Admin dan klik create payment. Nominal selalu dibaca dari grand total order di
server. Pending payment link yang masih aktif direuse; order lunas tidak akan
mendapat link baru.

## 5. Test callback/notify

1. Selesaikan payment sandbox.
2. Pastikan iPaymu mengirim POST ke endpoint notify publik.
3. Pastikan callback membawa `X-Signature` valid.
4. Pastikan payment menjadi `paid`, order menjadi `payment_received`, dan
   tracking customer menampilkan pembayaran diterima.
5. Kirim ulang callback yang sama dan pastikan event/tracking tidak berganda.
6. Uji signature salah, amount berbeda, dan status asing. Ketiganya tidak
   boleh menandai order paid; amount/status asing masuk `manual_review`.

Signature callback mengikuti dokumentasi iPaymu: normalisasi tipe data, urutkan
key, JSON serialize, escape slash, lalu HMAC-SHA256 menggunakan VA sebagai
secret. Raw payload sensitif tidak disimpan atau dikembalikan ke client.

## 6. Pindah ke live

Hanya lakukan setelah sandbox end-to-end lulus:

```env
PAYMENT_PROVIDER=ipaymu
PAYMENT_MODE=live
IPAYMU_ENABLED=true
IPAYMU_MODE=live
IPAYMU_BASE_URL=https://my.ipaymu.com
IPAYMU_VA=<live-va-from-secret-manager>
IPAYMU_API_KEY=<live-api-key-from-secret-manager>
IPAYMU_NOTIFY_URL=https://app.ofissio.com/api/payment/ipaymu/callback
IPAYMU_RETURN_URL=https://app.ofissio.com/payment/return
IPAYMU_CANCEL_URL=https://app.ofissio.com/payment/cancel
IPAYMU_TEST_CREATE_PAYMENT=false
```

Mode live membutuhkan kedua flag mode bernilai `live` secara eksplisit dan URL
notify HTTPS publik. Lakukan rotasi credential bila pernah muncul di log atau
alat komunikasi.

## 7. Rollback ke mock

```env
PAYMENT_PROVIDER=mock
PAYMENT_MODE=sandbox
IPAYMU_ENABLED=false
IPAYMU_TEST_CREATE_PAYMENT=false
```

Restart aplikasi. Order/payment yang sudah tersimpan tidak dihapus; hanya
provider untuk payment baru yang kembali ke mock.
