# Phase 10 — Staging and GitHub push readiness

Phase 10 menyiapkan Ofissio untuk GitHub push dan staging setup tanpa deploy production, tanpa secret asli, dan tanpa implementasi provider live.

## Scope

- Git repository hygiene.
- Secret scan/check.
- GitHub Actions CI foundation.
- Staging environment plan.
- External service readiness documentation.
- Staging smoke test guide.
- Package script review.

## Artifacts

- `.env.staging.example`
- `.github/workflows/ci.yml`
- `docs/staging-setup.md`
- `docs/email-setup.md`
- `docs/woocommerce-staging.md`
- `docs/payment-staging.md`
- `docs/shipping-staging.md`
- `docs/storage-database-readiness.md`
- `docs/staging-smoke-test.md`

## Current staging posture

- Default staging mode tetap `PRODUCT_SOURCE=mock`, `PAYMENT_PROVIDER=mock`, dan `SHIPPING_PROVIDER=mock`.
- WooCommerce staging boleh diuji setelah env staging tersedia.
- Resend boleh diuji setelah API key staging dan domain sender siap.
- iPaymu sandbox/live belum boleh aktif sampai signature resmi diimplementasikan.
- Shipping provider real belum boleh aktif sampai provider dipilih dan sandbox pass.

## Git hygiene notes

- `.claude/` di-ignore karena berisi konfigurasi lokal Claude Code.
- `.env.staging` di-ignore; `.env.staging.example` boleh commit.
- Log dev tetap di-ignore.
- Jangan gunakan `git add .` sebelum memeriksa `git status --short --ignored`.

## Production guardrail

Phase 10 tidak melakukan deploy production dan tidak melakukan git push otomatis.

## Hasil validasi

Tanggal validasi: 2026-07-29.

- `npm run check:env`: pass development.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.
- `npm run check:all`: pass.
- Endpoint local smoke: `/catalog`, `/product/kemeja-kantor-kk-006`, dan `/3d/kk-006.glb` 200.
- Browser/API smoke: Preview 3D canvas, add to cart, checkout cart API, shipping mock, payment mock success, dashboard, tracking order, Ofistant tracking prompt, repeat order label, dan mobile bottom preview pass.
- Browser console smoke: 0 error.
- Client bundle secret scan: no secret/client WooCommerce match di `.next/static`.

## Bug readiness yang diperbaiki

- CSP `connect-src` ditambah `blob:` agar Three.js/GLTFLoader tidak memblokir texture blob pada 3D viewer.
