# Phase 11 — Auth + database production foundation

Phase 11 menyiapkan Ofissio bergerak dari mock/memory menuju staging yang lebih nyata, tanpa production launch.

## Yang dibuat

- Database runtime config dan health foundation.
- Auth runtime config, session model, mock provider, Supabase provider boundary.
- Repository abstraction untuk company/user/cart/order/payment/tracking/audit/upload.
- `/api/health`.
- Draft schema SQL dan seed development.
- Dokumentasi Supabase, schema, auth/database foundation, dan company isolation.

## Env baru

```bash
DATABASE_PROVIDER=mock
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AUTH_PROVIDER=mock
AUTH_SESSION_COOKIE_NAME=ofissio_session
```

## Company isolation improvement

- API checkout cart memakai scope session setelah company guard.
- Payment create memakai scope session setelah company guard.
- Shipping rates memakai scope session setelah company guard.
- Tracking list/detail memakai company name dari session jika tersedia.
- Existing `requireCompanyAccess()` tetap menolak mismatch.

## Hasil validasi lokal

- `npm run check:env`: pass.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.
- `npm run check:all`: pass.
- `/api/health`: 200, provider aktif `mock`.
- `/catalog`: 200 dan KK-006 tetap tampil.
- `/product/kemeja-kantor-kk-006`: 200 dan metadata `kk-006.glb` tetap tampil.
- `/3d/kk-006.glb`: 200.
- Smoke API: cart sync -> shipping rates mock -> payment mock -> payment complete -> tracking record berhasil.
- Smoke company isolation: payment beda company tertolak 403, tracking beda company aman 404.
- Smoke browser desktop: modal 3D terbuka, canvas muncul, ESC menutup modal, cart menyimpan `p-012` dan `/3d/kk-006.glb`.
- Smoke browser mobile: detail produk terbuka dan tidak ada horizontal overflow.
- Security scan: secret server-side seperti `SUPABASE_SERVICE_ROLE_KEY`, `WOOCOMMERCE_CONSUMER_SECRET`, `IPAYMU_API_KEY`, dan `RESEND_API_KEY` tidak ditemukan di `.next/static`.

## Known limitation

- Auth production belum aktif penuh.
- Supabase env belum diisi.
- Schema belum diterapkan ke cloud.
- Data lama masih sebagian memory/mock.
- RLS policy masih draft.
- Storage upload production belum ada.
- Payment tetap mock.
- Shipping tetap mock/manual.
- WooCommerce live belum dites.
- Email production belum aktif.

## Production guardrail

Tidak ada deploy production, tidak ada iPaymu live, tidak ada shipping provider real, dan tidak ada database cloud yang dibuat otomatis pada Phase 11.
