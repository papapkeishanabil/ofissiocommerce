# Production go-live checklist

Status hanya boleh diberi centang berdasarkan bukti, bukan asumsi. Keputusan final adalah **GO**, **CONDITIONAL_GO** (staging saja), atau **NO_GO**.

Gunakan [production-go-no-go-report.md](./production-go-no-go-report.md),
[release-checklist.md](./release-checklist.md),
[migration-application-checklist.md](./migration-application-checklist.md), dan
[final-smoke-test.md](./final-smoke-test.md) sebagai satu paket bukti release.

## 1. Environment dan security gate

- [ ] `APP_ENV=production` dan `APP_URL` memakai HTTPS production.
- [ ] `LEGAL_REVIEW_APPROVED=true` setelah bukti approval legal/bisnis tersedia.
- [ ] `AUTH_PROVIDER=supabase`, `AUTH_MODE=production`.
- [ ] `ADMIN_DEV_BYPASS=false`, `INTERNAL_DEV_HEADERS_ENABLED=false`.
- [ ] Email verification, admin RBAC, company isolation, dan session cookie production diuji.
- [ ] Akun `super_admin` production pertama dibuat tanpa password seed dan MFA/akses owner diverifikasi.
- [ ] Migration terakhir diterapkan dan `npm run check:rls` PASS.
- [ ] Semua bucket customer private; signed URL tidak permanen.
- [ ] Secret hanya di secret manager, tidak ada di client bundle/log/Git.
- [ ] `.env.local` tidak tracked.
- [ ] Penetration test/CSP review atau risk acceptance terdokumentasi.

## 2. Provider live

- [ ] `PAYMENT_PROVIDER=ipaymu`, mode live eksplisit, test-create false.
- [ ] Callback iPaymu HTTPS publik tervalidasi; duplicate/amount mismatch aman.
- [ ] `SHIPPING_PROVIDER=biteship`, mode live eksplisit, test-create false.
- [ ] Webhook Biteship HTTPS publik, secret valid, create idempotent.
- [ ] SMTP sender, SPF, DKIM, DMARC, reply-to, bounce/failure diuji.
- [ ] WooCommerce credential production server-side; write flags eksplisit.
- [ ] `WOOCOMMERCE_TEST_WRITE=false`.
- [ ] `IPAYMU_TEST_CREATE_PAYMENT=false`, `BITESHIP_TEST_CREATE_SHIPMENT=false`, dan `GINEE_TEST_LIVE=false`.
- [ ] `STOCK_CUSTOMER_VISIBILITY=false`.

## 3. Business flow

- [ ] Produk WooCommerce ready, foto/variation SKU/harga/metadata lengkap.
- [ ] Customer tidak melihat stok atau status out-of-stock internal.
- [ ] Quotation request, pricing, send email/PDF, accept, dan convert order diuji.
- [ ] Invoice berisi payment link/QR yang aktif dan jumlah sesuai order backend.
- [ ] Paid hanya berasal dari callback valid.
- [ ] Fulfillment/customization/production routing diuji.
- [ ] Shipment, tracking, dan notifikasi customer diuji.
- [ ] File logo/artwork serta internal note tidak bocor antar-company/customer.

## 4. Operasional

- [ ] Owner monitoring, incident, payment reconciliation, shipping, dan customer support ditetapkan.
- [ ] Dashboard/log alert kritis aktif.
- [ ] Backup database/storage/WooCommerce terbaru tersedia.
- [ ] Restore drill staging lulus dan buktinya disimpan.
- [ ] Rollback SOP disimulasikan.
- [ ] Tim admin memahami order workbench, process order, invoice, payment, dan shipment.
- [ ] Support contact dan escalation matrix tersedia.

## 5. Legal dan komunikasi

- [ ] Privacy Policy ditinjau penasihat hukum/pemilik bisnis.
- [ ] Terms of Service ditinjau.
- [ ] Refund/cancellation policy ditinjau untuk produk custom.
- [ ] Shipping policy ditinjau.
- [ ] Footer/link legal production dapat dibuka di mobile dan desktop.
- [ ] Template email/PDF dan kontak perusahaan telah disetujui.

## 6. Command gate

```bash
npm run check:env
npm run check:production-readiness
npm run check:auth
npm run check:rls
npm run check:supabase
npm run check:storage
npm run check:woocommerce-stock
npm run check:woocommerce-product-standard
npm run check:email
npm run check:documents
npm run check:payment
npm run check:shipping
npm run typecheck
npm run lint
npm run build
npm run check:all
```

- [ ] Semua FAIL diselesaikan.
- [ ] Setiap WARN memiliki owner, justifikasi, mitigasi, dan approval.
- [ ] Browser console 0 error pada critical flow desktop/mobile.
- [ ] Git tag release immutable dibuat setelah seluruh gate lulus dan dicatat sebagai rollback version.

## Go/no-go record

- Tanggal/waktu:
- Release/commit:
- Incident commander:
- Business owner:
- Keputusan:
- Accepted risks:
- Rollback version:
- Link bukti smoke test:
