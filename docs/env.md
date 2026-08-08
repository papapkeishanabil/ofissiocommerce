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

Final database security tidak membutuhkan secret baru. Setelah migration 020
diterapkan, verifikasi env dan policy aktif dengan:

```bash
npm run check:env
npm run check:rls
```

`check:rls` memakai `NEXT_PUBLIC_SUPABASE_ANON_KEY` hanya untuk memastikan akses
anonymous ditolak, dan `SUPABASE_SERVICE_ROLE_KEY` hanya dari proses server untuk
membaca inventory RLS tanpa membaca isi row customer.

## Env utama

```bash
APP_URL=
APP_ENV=development
LEGAL_REVIEW_APPROVED=false
NODE_ENV=
LOG_LEVEL=info

PRODUCT_SOURCE=mock

DATABASE_PROVIDER=mock
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

AUTH_PROVIDER=mock
AUTH_MODE=development
AUTH_REQUIRE_EMAIL_VERIFICATION=false
ADMIN_DEV_BYPASS=false
INTERNAL_DEV_HEADERS_ENABLED=false
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
PRODUCT_IMAGE_MAX_MB=10

WOOCOMMERCE_ENABLED=false
WOOCOMMERCE_BASE_URL=
WOOCOMMERCE_CONSUMER_KEY=
WOOCOMMERCE_CONSUMER_SECRET=
WOOCOMMERCE_SYNC_ORDERS=false
WORDPRESS_MEDIA_BASE_URL=
WORDPRESS_MEDIA_USERNAME=
WORDPRESS_MEDIA_APP_PASSWORD=
WORDPRESS_MEDIA_TOKEN=

PAYMENT_PROVIDER=mock
PAYMENT_MODE=sandbox
IPAYMU_ENABLED=false
IPAYMU_MODE=sandbox
IPAYMU_VA=
IPAYMU_API_KEY=
IPAYMU_BASE_URL=https://sandbox.ipaymu.com
IPAYMU_NOTIFY_URL=https://your-public-staging.example/api/payment/ipaymu/callback
# Legacy alias only; prefer IPAYMU_NOTIFY_URL.
IPAYMU_CALLBACK_URL=
IPAYMU_RETURN_URL=
IPAYMU_CANCEL_URL=
IPAYMU_EXPIRE_MINUTES=1440
IPAYMU_TEST_CREATE_PAYMENT=false

SHIPPING_PROVIDER=mock
DEFAULT_ORIGIN_CITY=Bandung
DEFAULT_ORIGIN_POSTAL_CODE=
SHIPPING_PROVIDER_API_KEY=

EMAIL_PROVIDER=smtp
EMAIL_ENABLED=true
RESEND_API_KEY=
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@ofissio.com
SMTP_PASSWORD=
EMAIL_FROM="Ofissio <noreply@ofissio.com>"
EMAIL_REPLY_TO=sales@ofissio.com
SALES_QUOTATION_EMAIL=sales@ofissio.com
ORDER_NOTIFICATION_EMAIL_ENABLED=true
ORDER_NOTIFICATION_EMAILS=admin@ofissio.com,sales@ofissio.com
EMAIL_TEST_SEND=false
EMAIL_TEST_TO=

AUTH_SECRET=
NEXTAUTH_SECRET=
```

## Aturan secret

- Jangan pakai `NEXT_PUBLIC_` untuk API key atau secret.
- Jangan buat `NEXT_PUBLIC_RESEND_API_KEY`.
- Jangan buat `NEXT_PUBLIC_IPAYMU_API_KEY` atau `NEXT_PUBLIC_IPAYMU_VA`.
- Jangan buat `NEXT_PUBLIC_WOOCOMMERCE_CONSUMER_SECRET`.
- Jangan buat `NEXT_PUBLIC_WORDPRESS_MEDIA_APP_PASSWORD` atau `NEXT_PUBLIC_WORDPRESS_MEDIA_TOKEN`.
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
AUTH_MODE=development
ADMIN_DEV_BYPASS=false
INTERNAL_DEV_HEADERS_ENABLED=false
PAYMENT_PROVIDER=mock
SHIPPING_PROVIDER=mock
WOOCOMMERCE_ENABLED=false
WOOCOMMERCE_SYNC_ORDERS=false
STORAGE_PROVIDER=mock
```

Development tidak boleh crash hanya karena credential production kosong.

## Production readiness gate

`APP_ENV` menentukan ketatnya readiness gate dan tidak menggantikan
`NODE_ENV`. Gunakan `development`, `staging`, atau `production`. Sebelum go-live:

```bash
npm run check:production-readiness
```

Pada development/staging, provider sandbox atau layanan yang belum live muncul
sebagai `WARN` agar smoke test tetap dapat berjalan. Pada production,
konfigurasi wajib yang belum aman berubah menjadi `FAIL`. Minimal production:

```bash
APP_ENV=production
LEGAL_REVIEW_APPROVED=true
AUTH_PROVIDER=supabase
AUTH_MODE=production
ADMIN_DEV_BYPASS=false
INTERNAL_DEV_HEADERS_ENABLED=false
PAYMENT_PROVIDER=ipaymu
IPAYMU_TEST_CREATE_PAYMENT=false
SHIPPING_PROVIDER=biteship
BITESHIP_TEST_CREATE_SHIPMENT=false
STOCK_CUSTOMER_VISIBILITY=false
GINEE_TEST_LIVE=false
WOOCOMMERCE_SYNC_ORDERS=true
WOOCOMMERCE_TEST_WRITE=false
```

Nilai secret tetap berada di secret manager dan tidak dicetak oleh checker.
`LEGAL_REVIEW_APPROVED=true` hanya boleh diset setelah Privacy Policy, Terms of
Service, Refund Policy, dan Shipping Policy disetujui pemilik bisnis/penasihat
hukum. Flag ini bukan pengganti bukti approval.

## Staging

Staging dipakai untuk mengisi credential real secara bertahap:

- WooCommerce sandbox/staging URL.
- Supabase staging project setelah schema review.
- Resend API key dan domain sender yang sudah diverifikasi.
- iPaymu sandbox setelah kontrak signature final.
- iPaymu membutuhkan `PAYMENT_MODE=sandbox`, `IPAYMU_MODE=sandbox`,
  `IPAYMU_ENABLED=true`, notify URL HTTPS publik, return URL, cancel URL, dan
  `npm run check:payment`.
- `IPAYMU_TEST_CREATE_PAYMENT=false` adalah default. Ubah menjadi `true` hanya
  ketika memang hendak membuat satu transaksi sandbox nyata dari script check.
- Shipping provider sandbox setelah provider dipilih.

WooCommerce live test masih pending sampai env tersedia.

## Production

Production belum boleh diaktifkan sampai gap berikut selesai:

- Migration auth Task D diterapkan dan akun `super_admin` pertama diuji.
- Database dan storage persistent.
- iPaymu live signature verified.
- Shipping provider real.
- Resend domain verified dan test delivery.
- WooCommerce product/order sync staging pass.

Gunakan [production-go-live-checklist.md](./production-go-live-checklist.md),
[backup-and-restore.md](./backup-and-restore.md), dan
[rollback-sop.md](./rollback-sop.md) sebagai gate operasional final.

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
AUTH_MODE=production
AUTH_REQUIRE_EMAIL_VERIFICATION=true
ADMIN_DEV_BYPASS=false
INTERNAL_DEV_HEADERS_ENABLED=false
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AUTH_SESSION_COOKIE_NAME=ofissio_session
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` boleh public untuk client auth. `SUPABASE_SERVICE_ROLE_KEY` hanya boleh disimpan server-side di hosting secret manager.

`AUTH_MODE=production` menolak `AUTH_PROVIDER=mock`. Header development dan
admin bypass hanya berfungsi pada `AUTH_MODE=development` serta harus diaktifkan
eksplisit. Lihat `docs/auth-production.md`.

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
ORDER_NOTIFICATION_EMAIL_ENABLED=false
ORDER_NOTIFICATION_EMAILS=
EMAIL_TEST_SEND=false
EMAIL_TEST_TO=
```

Email internal order baru bersifat opt-in. Aktifkan
`ORDER_NOTIFICATION_EMAIL_ENABLED=true` dan isi penerima yang dipisahkan koma.
Pada `EMAIL_PROVIDER=mock`, hanya email log mock yang dibuat; tidak ada email real.

`EMAIL_TEST_TO` adalah recipient eksplisit untuk smoke Resend. Jika kosong,
`check:email` memakai penerima notifikasi order pertama, lalu
`SALES_QUOTATION_EMAIL`. `EMAIL_TEST_SEND` harus tetap `false` kecuali saat satu
pengiriman test eksplisit.

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

## Shipping / Biteship

Development aman menggunakan:

```bash
SHIPPING_PROVIDER=mock
SHIPPING_MODE=sandbox
BITESHIP_ENABLED=false
BITESHIP_TEST_CREATE_SHIPMENT=false
```

Staging Biteship menggunakan:

```bash
SHIPPING_PROVIDER=biteship
SHIPPING_MODE=sandbox
BITESHIP_ENABLED=true
BITESHIP_MODE=sandbox
BITESHIP_BASE_URL=https://api.biteship.com
BITESHIP_API_KEY=
BITESHIP_WEBHOOK_SECRET=
BITESHIP_WEBHOOK_URL=https://staging-domain/api/shipping/biteship/webhook
BITESHIP_ORIGIN_CONTACT_NAME="Ofissio Fulfillment"
BITESHIP_ORIGIN_CONTACT_PHONE=
BITESHIP_ORIGIN_ADDRESS=
BITESHIP_ORIGIN_POSTAL_CODE=
BITESHIP_ORIGIN_AREA_ID=
BITESHIP_COURIERS=jne,sicepat,jnt,anteraja
BITESHIP_TEST_CREATE_SHIPMENT=false
```

API key dan webhook secret hanya server-side. Production tidak boleh memakai
mock kecuali `SHIPPING_ALLOW_MOCK_IN_PRODUCTION=true` diset sebagai fallback
eksplisit. Detail setup dan smoke test ada di `docs/biteship-shipping.md`.
# Ginee inventory read-only (Task G1)

Gunakan `GINEE_ENABLED`, `GINEE_MODE`, `GINEE_BASE_URL`, `GINEE_COUNTRY`,
`GINEE_ACCESS_KEY`, `GINEE_SECRET_KEY`, dan `GINEE_TEST_LIVE`. Task G1 hanya
membaca inventory berdasarkan Stock SKU per ukuran. Tidak ada order import,
webhook order, stock update, atau two-way sync.

Credential Ginee hanya boleh berada di environment server dan tidak boleh
memakai prefix `NEXT_PUBLIC_`. Default `GINEE_TEST_LIVE=false` memastikan check
lokal memakai provider mock. Panduan lengkap ada di
[ginee-integration.md](./ginee-integration.md).

## WooCommerce stock monitoring

Gunakan konfigurasi server berikut untuk monitoring stok internal:

```bash
STOCK_MONITORING_ENABLED=true
STOCK_DEFAULT_MINIMUM_QTY=10
STOCK_SOURCE=woocommerce
STOCK_CUSTOMER_VISIBILITY=false
```

`STOCK_CUSTOMER_VISIBILITY` harus tetap `false`. Jumlah stok, status habis, dan
shortage hanya ditampilkan pada Ofissio Admin. Detail arsitektur dan aturan SKU
tersedia di [woocommerce-stock-monitoring.md](./woocommerce-stock-monitoring.md).
