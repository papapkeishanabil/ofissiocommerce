# Staging setup

Staging adalah lingkungan uji sebelum production live. Tujuannya memvalidasi build, env, integration boundary, smoke test customer flow, dan keamanan secret tanpa menerima transaksi production.

## Local vs staging vs production

- Local: `npm run dev`, mock product/payment/shipping, data local/mock, cocok untuk development cepat.
- Staging: build production dengan domain staging, HTTPS, env secret dari dashboard hosting, dan external service sandbox bila tersedia.
- Production: domain live, auth/database/storage/payment/shipping/email production sudah siap dan sudah lolos checklist launch.

## Platform deployment yang disarankan

1. Vercel: paling cepat untuk Next.js, preview deployment, env dashboard, dan rollback mudah.
2. VPS: fleksibel jika ingin kontrol server sendiri, tetapi butuh process manager, reverse proxy, SSL, logging, backup, dan deployment script.
3. Docker/VPS nanti: cocok setelah database/storage/auth production dipilih dan runtime distandardkan.

## Env staging

Gunakan `.env.staging.example` sebagai template. Isi secret lewat dashboard platform, bukan file repo.

Default staging awal:

```bash
PRODUCT_SOURCE=mock
DATABASE_PROVIDER=mock
AUTH_PROVIDER=mock
PAYMENT_PROVIDER=mock
SHIPPING_PROVIDER=mock
WOOCOMMERCE_ENABLED=false
WOOCOMMERCE_SYNC_ORDERS=false
```

## Domain dan HTTPS

Contoh domain:

- `staging.ofissio.com`
- `app-staging.ofissio.com`

Staging wajib HTTPS karena payment callback, email link, cookie/session production-like, dan browser security behavior harus mirip production.

## Deploy staging manual

```bash
npm ci
npm run check:env
npm run typecheck
npm run lint
npm run build
npm run start
```

Jika menggunakan Vercel, deploy dari branch staging/main setelah CI pass dan env sudah diisi di dashboard.

## Rollback staging

- Rollback ke deployment Vercel sebelumnya, atau
- checkout commit/tag stabil sebelumnya di VPS, install, build, restart service.

Setelah rollback, jalankan staging smoke test ulang.

## External service di staging

Boleh aktif bertahap:

- Resend sandbox/domain verified untuk test quotation email. Default staging boleh tetap `EMAIL_PROVIDER=mock` sampai domain pengirim siap.
- WooCommerce staging site.
- Supabase staging project setelah schema review.
- iPaymu sandbox setelah signature resmi diimplementasikan.
- Shipping sandbox setelah provider dipilih.
- Object storage staging bucket.
- Database staging.

Belum boleh live:

- iPaymu live.
- Shipping provider production.
- WooCommerce production write sync.
- Production customer data.

## Smoke test staging

Gunakan [staging-smoke-test.md](./staging-smoke-test.md).

## Checklist sebelum promosi production

- CI pass.
- Build staging pass.
- Smoke test customer flow pass.
- Secret scan pass.
- Email staging pass bila Resend aktif.
- WooCommerce staging pass bila env tersedia.
- iPaymu sandbox signature pass sebelum payment real.
- Backup/restore plan diuji.
- Monitoring/alert minimal aktif.
