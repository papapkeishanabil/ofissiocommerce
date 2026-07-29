# Environment readiness

Dokumen ini adalah panduan env untuk development, staging, dan production. Jangan commit secret asli ke Git.

## Cara pakai

1. Copy `.env.example` menjadi `.env.local` untuk development.
2. Isi secret lewat dashboard hosting untuk staging/production.
3. Jalankan env checker sebelum deploy:

```bash
node --experimental-strip-types scripts/check-env.ts
```

Di development, env production yang kosong hanya menjadi warning. Di production, env wajib yang kosong dianggap error.

## Env utama

```bash
APP_URL=
NODE_ENV=
LOG_LEVEL=info

PRODUCT_SOURCE=mock

WOOCOMMERCE_ENABLED=false
WOOCOMMERCE_BASE_URL=
WOOCOMMERCE_CONSUMER_KEY=
WOOCOMMERCE_CONSUMER_SECRET=
WOOCOMMERCE_SYNC_ORDERS=false

PAYMENT_PROVIDER=mock
IPAYMU_VA=
IPAYMU_API_KEY=
IPAYMU_BASE_URL=
IPAYMU_CALLBACK_URL=
IPAYMU_RETURN_URL=
IPAYMU_CANCEL_URL=

SHIPPING_PROVIDER=mock
DEFAULT_ORIGIN_CITY=Bandung
DEFAULT_ORIGIN_POSTAL_CODE=
SHIPPING_PROVIDER_API_KEY=

EMAIL_PROVIDER=resend
RESEND_API_KEY=
EMAIL_FROM="Ofissio <quotation@ofissio.com>"
SALES_QUOTATION_EMAIL=

AUTH_SECRET=
NEXTAUTH_SECRET=
```

## Aturan secret

- Jangan pakai `NEXT_PUBLIC_` untuk API key atau secret.
- Jangan buat `NEXT_PUBLIC_RESEND_API_KEY`.
- Jangan buat `NEXT_PUBLIC_IPAYMU_API_KEY`.
- Jangan buat `NEXT_PUBLIC_WOOCOMMERCE_CONSUMER_SECRET`.
- `.env.local`, `.env.production`, `.env`, log, `.next`, dan `node_modules` tidak boleh ikut commit.

## Development

Gunakan default aman:

```bash
PRODUCT_SOURCE=mock
PAYMENT_PROVIDER=mock
SHIPPING_PROVIDER=mock
WOOCOMMERCE_ENABLED=false
WOOCOMMERCE_SYNC_ORDERS=false
```

Development tidak boleh crash hanya karena credential production kosong.

## Staging

Staging dipakai untuk mengisi credential real secara bertahap:

- WooCommerce sandbox/staging URL.
- Resend API key dan domain sender yang sudah diverifikasi.
- iPaymu sandbox setelah kontrak signature final.
- Shipping provider sandbox setelah provider dipilih.

WooCommerce live test masih pending sampai env tersedia.

## Production

Production belum boleh diaktifkan sampai gap berikut selesai:

- Auth/session production.
- Database dan storage persistent.
- iPaymu live signature verified.
- Shipping provider real.
- Resend domain verified dan test delivery.
- WooCommerce product/order sync staging pass.

## Email / Resend

Gunakan:

```bash
EMAIL_PROVIDER=resend
RESEND_API_KEY=
EMAIL_FROM="Ofissio <quotation@ofissio.com>"
SALES_QUOTATION_EMAIL=
```

`RESEND_API_KEY` diambil dari dashboard Resend dan tidak boleh di-commit. `EMAIL_FROM` production harus memakai domain yang sudah diverifikasi. `SALES_QUOTATION_EMAIL` adalah alamat internal sales penerima notifikasi quotation.

Jika belum ada inbox `quotation@ofissio.com`, pengiriman outbound tetap bisa berjalan setelah domain verified, tetapi balasan customer membutuhkan mailbox atau forwarding.
