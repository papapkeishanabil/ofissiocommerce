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

DATABASE_PROVIDER=mock
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

AUTH_PROVIDER=mock
AUTH_SESSION_COOKIE_NAME=ofissio_session

STORAGE_PROVIDER=mock
STORAGE_BUCKET_LOGOS=ofissio-logos
STORAGE_BUCKET_ARTWORK=ofissio-artwork
STORAGE_BUCKET_DOCUMENTS=ofissio-documents
STORAGE_BUCKET_3D=ofissio-3d-models
STORAGE_SIGNED_URL_EXPIRES_SECONDS=3600
MAX_LOGO_UPLOAD_MB=10
MAX_DOCUMENT_UPLOAD_MB=20
MAX_GLB_UPLOAD_MB=100

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

EMAIL_PROVIDER=mock
EMAIL_ENABLED=false
RESEND_API_KEY=
EMAIL_FROM="Ofissio <quotation@ofissio.com>"
EMAIL_REPLY_TO=
SALES_QUOTATION_EMAIL=

AUTH_SECRET=
NEXTAUTH_SECRET=
```

## Aturan secret

- Jangan pakai `NEXT_PUBLIC_` untuk API key atau secret.
- Jangan buat `NEXT_PUBLIC_RESEND_API_KEY`.
- Jangan buat `NEXT_PUBLIC_IPAYMU_API_KEY`.
- Jangan buat `NEXT_PUBLIC_WOOCOMMERCE_CONSUMER_SECRET`.
- Jangan buat `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`.
- Jangan buat `NEXT_PUBLIC_STORAGE_SECRET`.
- Jangan buat `NEXT_PUBLIC_S3_SECRET_ACCESS_KEY` atau `NEXT_PUBLIC_R2_SECRET_ACCESS_KEY`.
- `.env.local`, `.env.production`, `.env`, log, `.next`, dan `node_modules` tidak boleh ikut commit.

## Development

Gunakan default aman:

```bash
PRODUCT_SOURCE=mock
DATABASE_PROVIDER=mock
AUTH_PROVIDER=mock
PAYMENT_PROVIDER=mock
SHIPPING_PROVIDER=mock
WOOCOMMERCE_ENABLED=false
WOOCOMMERCE_SYNC_ORDERS=false
STORAGE_PROVIDER=mock
```

Development tidak boleh crash hanya karena credential production kosong.

## Staging

Staging dipakai untuk mengisi credential real secara bertahap:

- WooCommerce sandbox/staging URL.
- Supabase staging project setelah schema review.
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

## Database / Supabase

Default aman:

```bash
DATABASE_PROVIDER=mock
AUTH_PROVIDER=mock
```

Untuk staging Supabase nanti:

```bash
DATABASE_PROVIDER=supabase
AUTH_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AUTH_SESSION_COOKIE_NAME=ofissio_session
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` boleh public untuk client auth. `SUPABASE_SERVICE_ROLE_KEY` hanya boleh disimpan server-side di hosting secret manager.

## Storage

Default aman:

```bash
STORAGE_PROVIDER=mock
STORAGE_BUCKET_LOGOS=ofissio-logos
STORAGE_BUCKET_ARTWORK=ofissio-artwork
STORAGE_BUCKET_DOCUMENTS=ofissio-documents
STORAGE_BUCKET_3D=ofissio-3d-models
STORAGE_SIGNED_URL_EXPIRES_SECONDS=3600
MAX_LOGO_UPLOAD_MB=10
MAX_DOCUMENT_UPLOAD_MB=20
MAX_GLB_UPLOAD_MB=100
```

Jika nanti memakai Supabase Storage:

```bash
STORAGE_PROVIDER=supabase
```

Lalu jalankan:

```bash
npm run check:storage
```

`SUPABASE_SERVICE_ROLE_KEY` tetap hanya server-side. Bucket customer production sebaiknya private dan diakses lewat signed URL. Setup bucket manual ada di `docs/supabase-storage-setup.md`.

## Email / Resend

Gunakan:

```bash
EMAIL_PROVIDER=mock
EMAIL_ENABLED=false
RESEND_API_KEY=
EMAIL_FROM="Ofissio <quotation@ofissio.com>"
EMAIL_REPLY_TO=
SALES_QUOTATION_EMAIL=
```

Default `mock` hanya mencatat email ke log foundation. Untuk email real, ubah `EMAIL_PROVIDER=resend`, set `EMAIL_ENABLED=true`, isi `RESEND_API_KEY`, dan pakai `EMAIL_FROM` dari domain yang sudah diverifikasi. `SALES_QUOTATION_EMAIL` adalah alamat internal sales penerima notifikasi quotation.

Jika belum ada inbox `quotation@ofissio.com`, pengiriman outbound tetap bisa berjalan setelah domain verified, tetapi balasan customer membutuhkan mailbox atau forwarding.

Jalankan:

```bash
npm run check:email
```

Real test send staging hanya dijalankan saat eksplisit:

```bash
EMAIL_TEST_SEND=true npm run check:email
```

Jangan set `NEXT_PUBLIC_RESEND_API_KEY`.
