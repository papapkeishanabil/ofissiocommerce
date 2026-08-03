# iPaymu Setup - Ofissio Phase 23

Phase 23 menyiapkan payment link iPaymu untuk staging/sandbox. Jangan gunakan untuk production launch sebelum sandbox callback tervalidasi end-to-end.

## Env

Isi di hosting secret atau `.env.local` lokal, jangan commit secret:

```env
PAYMENT_PROVIDER=ipaymu
PAYMENT_MODE=sandbox
IPAYMU_ENABLED=true
IPAYMU_MODE=sandbox
IPAYMU_VA=
IPAYMU_API_KEY=
IPAYMU_BASE_URL=https://sandbox.ipaymu.com
IPAYMU_NOTIFY_URL=https://staging.ofissio.com/api/payment/ipaymu/callback
IPAYMU_RETURN_URL=https://staging.ofissio.com/payment/return
IPAYMU_CANCEL_URL=https://staging.ofissio.com/payment/cancel
IPAYMU_EXPIRE_MINUTES=1440
IPAYMU_TEST_CREATE_PAYMENT=false
```

Server-only rule:

- Jangan membuat `NEXT_PUBLIC_IPAYMU_API_KEY`.
- `IPAYMU_API_KEY` dan `IPAYMU_VA` hanya dipakai server-side.
- `PAYMENT_PROVIDER=mock` tidak akan memanggil iPaymu.

## Sandbox vs live

- Sandbox default base URL: `https://sandbox.ipaymu.com`.
- Production/live base URL: `https://my.ipaymu.com`.
- VA dan API key sandbox berbeda dari live.
- Production membutuhkan validasi IP/domain di dashboard iPaymu.

## Callback / notify

Callback iPaymu harus diarahkan ke:

`/api/payment/ipaymu/callback`

Callback tidak memakai customer auth. Endpoint melakukan:

- Zod validation.
- `X-Signature` verification.
- Reference validation.
- Amount validation.
- Idempotency.
- Status update payment/order/tracking hanya jika valid.

Return URL browser tidak pernah menandai invoice LUNAS. Status paid hanya dari callback valid atau status verification server-side.

## Signature

Request API memakai HMAC-SHA256 dengan VA/API key sesuai dokumentasi iPaymu API v2. Callback memakai `X-Signature` dan VA sebagai secret key. Jika signature tidak valid, callback fail-closed.

## Payment link and QR

Jika iPaymu mengembalikan payment URL, sistem menyimpan:

- `payment_url`
- provider payment/session id jika ada
- expiry
- QR metadata jika provider mengembalikan

QR image rendering ke PDF masih foundation. PDF invoice saat ini menampilkan payment URL dan indikator QR metadata/placeholder aman. Jangan tampilkan QR palsu sebagai QR pembayaran aktif.

## Troubleshooting

- `check:payment` error env: isi variable iPaymu yang kosong.
- Signature callback gagal: pastikan VA sandbox/live yang dipakai benar.
- Invalid domain/IP: pastikan URL callback/return/cancel sesuai domain yang diizinkan iPaymu.
- Payment link tidak dibuat: cek `PAYMENT_PROVIDER`, `IPAYMU_ENABLED`, dan base URL.
