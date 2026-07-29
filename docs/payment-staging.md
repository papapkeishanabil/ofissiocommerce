# Payment staging readiness

Status saat ini payment masih mock/foundation. iPaymu live belum aktif.

## Default staging awal

```bash
PAYMENT_PROVIDER=mock
```

Payment mock tetap default sampai signature resmi dan sandbox contract test siap.

## iPaymu boundary

iPaymu callback tetap fail-closed sampai signature resmi diimplementasikan. Jangan menebak signature live.

Env yang dibutuhkan nanti:

```bash
PAYMENT_PROVIDER=ipaymu
IPAYMU_VA=
IPAYMU_API_KEY=
IPAYMU_BASE_URL=
IPAYMU_CALLBACK_URL=https://staging.ofissio.com/api/payment/ipaymu/callback
IPAYMU_RETURN_URL=https://staging.ofissio.com/payment/return
IPAYMU_CANCEL_URL=https://staging.ofissio.com/payment/cancel
```

## Checklist sebelum iPaymu live

- Merchant aktif.
- API key valid.
- Signature callback resmi diverifikasi.
- Request signature resmi diverifikasi.
- Amount comparison aktif.
- Reference ID check aktif.
- Idempotency aktif.
- Return URL tidak dianggap bukti paid.
- Test transaksi kecil di sandbox/staging.
- Safe error response tidak membocorkan payload provider.
