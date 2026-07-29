# Phase 9 — Production readiness

Phase 9 menyiapkan Ofissio untuk staging/production readiness tanpa deploy production dan tanpa membuat fitur besar baru.

## Scope

- Final project audit.
- Environment validation.
- Google Fonts build stability.
- Performance review.
- Security final review.
- Final testing checklist.
- Deployment documentation.
- Backup/restore plan.
- Monitoring/logging plan.
- Git push preparation.

## Yang dicek

- Route customer utama: `/`, `/catalog`, `/product/[slug]`, `/cart`, `/checkout`, `/dashboard`, `/orders/[id]`, quotation pages.
- API routes checkout, payment, shipping, tracking, quotation email, audit, dan 3D generation foundation.
- Product source switching mock/WooCommerce.
- Required GLB validation untuk product published.
- KK-006 tetap memakai `/3d/kk-006.glb`.
- Cart menolak produk tanpa GLB valid melalui server-side product validation.
- Payment mock menghitung ulang total dari cart canonical.
- Payment callback iPaymu fail-closed.
- Shipping mock/manual dan cache rate.
- Tracking/dashboard integration.
- Ofistant product recommendation dan tracking action.
- 3D configurator dan Smart Floating Preview.
- Security helper, rate limit, audit log, safe error response, CSP.
- Env dan git hygiene.

## Perubahan readiness

- `.env.example` distandardkan untuk app, WooCommerce, payment, shipping, email, auth placeholder, dan logging.
- `scripts/check-env.ts` ditambahkan untuk membedakan development/staging/production readiness.
- `next/font/google` diganti ke system font stack agar build tidak bergantung network Google Fonts.
- Dokumentasi env, deployment, testing, backup/restore, monitoring, production checklist, dan git push checklist ditambahkan.

## Hasil validasi Phase 9

Tanggal validasi: 2026-07-29.

- Env checker development: pass.
- Typecheck: pass.
- Lint: pass.
- Build production: pass.
- Build tidak lagi mencoba download Google Fonts.
- `/catalog`: 200.
- `/product/kemeja-kantor-kk-006`: 200.
- `/3d/kk-006.glb`: 200.
- Browser smoke desktop: katalog, detail KK-006, modal 3D canvas, add to cart, dan Smart Floating Preview pass.
- Browser smoke mobile: bottom mini bar tampil dan tidak ada horizontal overflow.
- API smoke checkout: cart sync, shipping mock rates, payment mock create, payment mock complete, payment status paid, order status `payment_received`, dan tracking record pass.
- Client bundle secret scan: tidak ditemukan `RESEND_API_KEY`, `IPAYMU_API_KEY`, `WOOCOMMERCE_CONSUMER_SECRET`, atau `woocommerce.client` di `.next/static`.

Catatan: WooCommerce live test tetap skipped karena env WooCommerce belum tersedia.

## Bug yang diperbaiki

- Runtime 500 product detail karena state `showFloatingPreviewModal` sempat tidak tersedia di working copy. State dikembalikan sehingga detail KK-006 kembali 200.
- `.server-dev.log` dan `debug.log` dikeluarkan dari Git index dan ditambahkan ke `.gitignore` agar log dev tidak ikut commit.

## Known limitation

- Auth masih mock.
- Database production belum ada.
- Data memory process akan hilang saat server restart.
- Rate limit masih in-memory.
- Audit log masih in-memory.
- Payment masih mock/foundation.
- iPaymu live belum aktif.
- iPaymu signature live belum diimplementasikan.
- Shipping masih mock/manual.
- Shipping provider real belum aktif.
- WooCommerce live belum dites karena env belum tersedia.
- WooCommerce order sync masih foundation dan default off.
- Upload GLB dari admin WooCommerce masih via custom field/plugin skeleton.
- Validasi remote GLB masih metadata/extension, belum cek binary remote.
- Private storage/signed URL belum ada.
- Antivirus scan dan SVG sanitization belum ada.
- Email production belum aktif sampai Resend API key dan domain verified siap.
- CSP production mungkin perlu penyesuaian domain GLB/CDN.

## Gap sebelum production live

- Real auth/session dan RBAC persistence.
- Database persistent dengan company isolation.
- Persistent audit log.
- Redis/Upstash rate limit.
- Private object storage dan signed URL untuk upload/artwork.
- Antivirus scan dan SVG sanitization.
- iPaymu sandbox/live signature contract tests.
- Shipping provider real.
- WooCommerce staging credential dan live sync test.
- Resend production domain verification.
- Monitoring provider dan alert.
- Backup restore test.
- Privacy Policy, Terms, Refund/Return policy, dan Contact page.

## Next step

Masuk Phase 10/staging hardening hanya setelah pemilik project menyetujui. Jangan deploy production dari Phase 9 tanpa konfirmasi eksplisit.
