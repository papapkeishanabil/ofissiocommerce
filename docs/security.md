# Ofissio Security Foundation

Dokumen ini mencatat baseline security Ofissio per Phase 7. Ini belum production security final; auth, database, Redis, object storage, iPaymu live, shipping provider real, dan WooCommerce tetap fase berikutnya.

## Architecture

- `src/lib/security/auth-guard.ts`: mock session guard. TODO production: ganti dengan server-side auth/session provider.
- `src/lib/security/role-guard.ts`: RBAC customer dan internal role map.
- `src/lib/security/company-access.ts`: helper isolasi company.
- `src/lib/security/validate-input.ts`: Zod boundary helper untuk body/query.
- `src/lib/security/rate-limit.ts`: in-memory rate limit dev.
- `src/lib/security/audit-log.ts`: in-memory audit log + safe console in dev.
- `src/lib/security/safe-error-response.ts`: response error konsisten tanpa stack trace.
- `src/lib/security/server-only-secret.ts`: helper env secret server-only.
- `src/lib/security/upload-security.ts`: foundation validasi upload.
- `src/lib/security/security-headers.ts`: baseline headers/CSP.

## Auth and RBAC plan

Customer roles:

- `company_admin`: akses penuh company.
- `purchasing`: cart, checkout, request quotation, view order.
- `approver`: approve artwork/quotation.
- `finance`: view invoice/payment.
- `viewer`: view order only.

Internal roles disiapkan: `super_admin`, `sales`, `finance_internal`, `product_admin`, `production_admin`, `ppic`, `qc`, `logistics`, `support`.

Current limitation: API memakai placeholder mock session dari `companyId/userId` body/query/header. Ini aman sebagai guard development, tetapi belum boleh dianggap auth production.

## Company isolation

Semua endpoint sensitif yang disentuh Phase 7 sekarang scoped ke `companyId`:

- checkout cart
- payment create/status/mock completion/callback
- shipping rates/create shipment/track
- tracking orders/list/detail
- client audit event
- Ofistant tracking action

Jika `companyId` resource berbeda dari session mock, API mengembalikan 403 safe response.

## Payment security

- Backend tetap menghitung nominal dari cart canonical, bukan frontend.
- iPaymu live tetap fail-closed sampai signature contract resmi dipasang.
- Callback divalidasi Zod.
- Callback amount/reference dicek terhadap payment record.
- Callback idempotent.
- Return URL tidak dianggap bukti paid.
- Raw provider payload tidak diteruskan ke client dan snapshot callback yang disimpan dibatasi.
- Invalid/unverified callback dicatat sebagai security event.

## Shipping security

- Shipping config dibaca server-only.
- Berat frontend diabaikan saat product data tersedia; backend memakai placeholder canonical weight sampai berat produk resmi ada.
- Destination divalidasi.
- Rate limit diterapkan.
- Provider error tidak dibocorkan mentah ke customer.
- Shipment tracking siap company-scoped.

## Upload security

Foundation upload mendukung allowlist:

- logo: `png`, `jpg`, `jpeg`, `svg`
- document: `pdf`
- spreadsheet: `xlsx`
- model 3D: `glb`

Rules:

- MIME dan ukuran divalidasi.
- Original filename disanitasi.
- Storage key dibuat random; original filename tidak dipakai sebagai path.
- GLB menerima `model/gltf-binary` atau `application/octet-stream`.
- TODO production: antivirus scan, SVG sanitize, signed URL/private storage.

## Audit log plan

Audit event minimal menyimpan:

- actor id/type
- company id
- action
- entity type/id
- metadata aman
- IP/user-agent
- timestamp

Current limitation: audit masih in-memory process dan hilang saat server restart. Production perlu persistent audit log.

## Ofistant security boundary

Ofistant:

- membaca order dari company/session saat ini;
- tidak membuka order company lain;
- tidak mengubah payment status/refund/harga/progress produksi;
- tidak mengarang status kalau data tidak ada;
- high-risk action tetap diarahkan ke human/admin.

## Security headers

Baseline headers diterapkan dari `next.config.ts`:

- `X-Frame-Options`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Permissions-Policy`
- `Content-Security-Policy`

CSP masih dev-friendly agar tidak merusak Next dev server, Three.js canvas, font, dan asset lokal seperti `/3d/kk-006.glb`. Production perlu CSP lebih ketat setelah asset/CDN final.

## Production security checklist

- Ganti mock auth dengan server-side session/JWT.
- Tambahkan persistent database + row-level company isolation.
- Ganti in-memory rate limit dengan Redis/Upstash/edge-compatible store.
- Implement iPaymu live signature sesuai dokumentasi merchant resmi.
- Tambahkan WooCommerce secret rotation dan scoped API permissions.
- Gunakan private object storage + signed URL untuk logo/PO/GLB.
- Tambahkan antivirus scan dan SVG sanitization.
- Tambahkan persistent audit log immutable.
- Review CSP final sesuai domain asset/payment/shipping.
- Tambahkan monitoring security event dan alerting.

## Phase 9 gap sebelum production

Gap berikut boleh tetap ada di readiness stage, tetapi wajib selesai sebelum production live:

- Real server auth/session.
- Persistent database.
- Row-level company isolation.
- Persistent audit log.
- Redis/Upstash rate limit.
- Private object storage + signed URL.
- Antivirus scan.
- SVG sanitization.
- iPaymu live signature.
- WooCommerce production hardening.
- Real email delivery verification.
- Staging penetration/security smoke test.
