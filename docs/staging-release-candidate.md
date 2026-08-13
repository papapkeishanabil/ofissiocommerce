# Ofissio staging release candidate

Tanggal checkpoint: 8 Agustus 2026  
Kandidat rilis: `v0.1.0-rc1` (belum dibuat)

## Keputusan

- **Staging: `CONDITIONAL_GO`.** Staging boleh digunakan untuk final smoke test dan validasi operasional terkontrol.
- **Live production: `NO_GO`.** Jangan menerima transaksi customer live atau mengaktifkan provider live.

Staging boleh lanjut dengan risiko yang diterima berikut:

1. iPaymu masih memakai sandbox sehingga pembayaran bukan transaksi live.
2. Biteship masih memakai sandbox sehingga shipment bukan pengiriman live.
3. `LEGAL_APPROVAL_STATUS` masih `draft` atau `internal_review`; dokumen legal belum mendapat persetujuan final.

Kondisi yang sama memblokir live production karena payment dan shipping belum memakai credential/mode live serta legal belum `approved`.

## Environment staging wajib

Nilai berikut harus diset eksplisit pada secret/environment manager staging:

```bash
STOCK_CUSTOMER_VISIBILITY=false
GINEE_TEST_LIVE=false
WOOCOMMERCE_TEST_WRITE=false
IPAYMU_TEST_CREATE_PAYMENT=false
BITESHIP_TEST_CREATE_SHIPMENT=false
LEGAL_APPROVAL_STATUS=draft
```

`LEGAL_APPROVAL_STATUS=internal_review` juga diperbolehkan untuk staging. Nilai tersebut tetap menghasilkan warning dan tidak mengizinkan live production.

Jangan menyimpan credential asli dalam repository. `.env.local` harus tetap di-ignore dan tidak boleh tracked oleh Git.

## Automated release gate

Jalankan dari root project:

```bash
npm run check:staging-rc
```

Runner memaksa konteks `APP_ENV=staging`, memeriksa safety flag, memastikan `.env.local` tidak tracked, memindai `.next/static` terhadap nilai secret server, lalu menjalankan:

- `check:env`
- `check:auth`
- `check:supabase`
- `check:storage`
- `check:rls`
- `check:woocommerce-stock`
- `check:woocommerce-product-standard`
- `check:payment`
- `check:shipping`
- `check:production-readiness`

Hasil yang diterima untuk RC ini adalah `CONDITIONAL_GO` dengan tiga warning yang diketahui: iPaymu sandbox, Biteship sandbox, dan legal belum approved. Critical security issue atau safety flag yang tidak aman harus menghasilkan `FAIL/NO_GO`.

## Bukti manual sebelum tag

- [ ] Seluruh checklist di [staging-smoke-test.md](./staging-smoke-test.md) selesai.
- [ ] Browser console bersih pada critical customer/admin flow.
- [ ] Desktop dan mobile telah diperiksa, termasuk horizontal overflow.
- [ ] ID quotation, order, payment sandbox, shipment sandbox, dan akun penguji dicatat tanpa menyimpan secret.
- [ ] Known warnings memiliki owner dan mitigasi.
- [ ] Release commit telah direview dan working tree bersih.
- [ ] User menyetujui pembuatan tag staging RC.

Tag tidak dibuat otomatis oleh checker. Instruksi manual tersedia di [release-checklist.md](./release-checklist.md).

## Batas staging RC

Staging RC bukan persetujuan live. Perubahan berikut wajib sebelum live production:

- iPaymu live beserta callback publik dan rekonsiliasi amount berhasil;
- Biteship live beserta rate, shipment, webhook, waybill, dan tracking berhasil;
- `LEGAL_APPROVAL_STATUS=approved` dengan bukti review di luar aplikasi;
- seluruh manual operational, backup/restore, monitoring, dan rollback sign-off selesai.
