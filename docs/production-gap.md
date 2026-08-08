# Production gap

Dokumen ini memisahkan **staging foundation complete** dari **production launch ready**.

## Status checkpoint A6

Commercial flow staging telah terbukti dari produk WooCommerce valid, pricing tier/global embroidery, cart, quotation snapshot/override, accept, convert idempotent, order notification, email mock, dan Ofistant. Gap di bawah tetap menjadi blocker production; kelulusan A6 tidak mengaktifkan provider live.

## Gap kritikal sebelum production

0. Final RLS/security gate
   - Task F code review tersedia melalui migration
     `020_rls_final_security_review.sql` dan `npm run check:rls`.
   - Terapkan migration 020 manual di staging setelah migration 001-019.
   - Bukti wajib: seluruh tabel inventory `RLS enabled + forced`, tidak ada direct
     browser write/anonymous policy, bucket aktif private, dan company-isolation
     smoke pass.
   - Jalankan external penetration test, CSP review, secret rotation drill, dan
     backup/restore drill sebelum production.

1. Supabase Auth activation
   - Task D code hardening selesai: cookie HTTP-only, refresh handling,
     middleware token verification, server RBAC, dan company isolation tersedia.
   - Terapkan migration `015_supabase_auth_production.sql` di staging.
   - Buat dan uji akun `super_admin` pertama tanpa menyimpan password di seed.
   - Aktifkan `AUTH_PROVIDER=supabase`, `AUTH_MODE=production`, dan email
     verification sesuai kebijakan.
   - Jalankan login/logout customer serta admin smoke test terhadap staging.
   - Service-role repository tetap bypass RLS; server guard dan audit monitoring
     harus dipertahankan.

2. iPaymu live/sandbox activation
   - Task C hardening code selesai: request memakai grand total backend,
     callback signature/reference/amount/status diverifikasi, status asing dan
     amount mismatch masuk manual review, serta event callback idempotent.
   - Isi credential sandbox pada secret manager staging, bukan repo.
   - Gunakan `PAYMENT_MODE=sandbox`, `IPAYMU_MODE=sandbox`, dan
     `IPAYMU_NOTIFY_URL` HTTPS publik.
   - Uji satu create payment sandbox dengan flag eksplisit
     `IPAYMU_TEST_CREATE_PAYMENT=true`.
   - Uji callback nyata valid/invalid melalui staging atau tunnel HTTPS.
   - Pastikan return URL tidak pernah menandai paid.
   - Pastikan QR payment invoice benar-benar scannable.
   - Sebelum live, ganti credential melalui secret manager terpisah lalu set
     `PAYMENT_MODE=live`, `IPAYMU_MODE=live`, dan base URL live secara eksplisit.

3. Hostinger SMTP live email
   - Verify sender domain, SPF, DKIM, dan DMARC.
   - Terapkan migration `013_smtp_email_provider.sql`.
   - Aktifkan `EMAIL_PROVIDER=smtp` dan `EMAIL_ENABLED=true` di staging dulu.
   - Simpan `SMTP_PASSWORD` hanya di secret manager.
   - Jalankan real test send eksplisit.
   - Monitor bounce/failure/reply path.
   - Gunakan `/admin/settings/email` untuk status, test internal, dan recent logs.
   - Pastikan invoice/payment-ready email diaktifkan setelah Task C/iPaymu; flow
     pengiriman invoice belum aktif pada Task B.

4. WooCommerce staging/live integration
   - Isi WooCommerce URL/key/secret di server secret manager.
   - Uji product source WooCommerce.
   - Pastikan hanya produk published dengan GLB valid yang tampil.
   - Pastikan `/orders` read permission WooCommerce berjalan.
   - Uji write smoke hanya di staging dengan `WOOCOMMERCE_TEST_WRITE=true`.
   - Uji order sync idempotent.
   - Pastikan `woo_order_id` tersimpan di Supabase dan `ofissio_order_id` masuk Woo order meta.
   - Pastikan secret WooCommerce tidak muncul di client bundle.
   - Pastikan WordPress Media Application Password/token tersedia server-side, permission `upload_files` benar, serta upload/reorder diuji terhadap WooCommerce staging.
   - Terapkan standard variable product Ofissio: Parent SKU, atribut Ukuran,
     variation SKU per ukuran, `manage_stock`, dan stock quantity per variation.
   - Jalankan `npm run check:woocommerce-product-standard`; selesaikan seluruh
     `LIVE WARN` pada KL-007/KK-006 sebelum stok dipakai tim operasional.

5. Biteship shipping activation
   - Task E provider adapter, server-side rate, idempotent create, persistence,
     webhook mapping, admin panel, dan tracking bridge sudah tersedia.
   - Terapkan migration `019_biteship_shipping.sql` di staging.
   - Isi credential sandbox dan origin warehouse melalui secret manager.
   - Kalibrasi berat/dimensi kemasan per SKU; Task E masih memakai default server.
   - Daftarkan webhook HTTPS publik dengan shared-secret authentication.
   - Uji rate, create, duplicate create, valid/invalid/duplicate webhook, waybill,
     tracking customer, dan satu delivery sandbox end-to-end.
   - Aktivasi live wajib memakai credential terpisah dan canary; fallback shipment
     manual dipertahankan.

6. Monitoring dan observability
   - Error monitoring.
   - Payment callback monitoring.
   - Email delivery monitoring.
   - Upload/storage failure monitoring.
   - 3D model load monitoring.
   - Monitor delivery email order baru dan pertimbangkan realtime notification setelah auth internal production aktif.

7. Backup/restore
   - Jadwal backup Supabase.
   - Drill restore staging.
   - Retention policy.

8. Security/policy production
   - Jalankan dan arsipkan hasil `npm run check:rls` setelah setiap perubahan
     schema/policy.
   - Privacy Policy.
   - Terms & Conditions.
   - Refund/return policy.
   - Contact/support page.
   - CSP review untuk GLB, storage signed URL, dan payment redirect.

9. Task I — operational go-live gate
   - `npm run check:production-readiness` tersedia untuk memisahkan PASS, WARN,
     dan FAIL berdasarkan `APP_ENV`.
   - Health endpoint menunjukkan status database/schema, auth, storage, email,
     payment, shipping, WooCommerce, dan invariant stok customer tanpa secret.
   - SOP backup/restore dan rollback tersedia, tetapi restore drill production
     belum selesai sampai ada bukti serta owner.
   - Empat halaman legal tersedia sebagai draft operasional. Legal review dan
     business approval tetap blocker sebelum go-live.
   - Monitoring eksternal, alert routing, on-call/escalation, dan retention log
     production masih perlu diaktifkan pada platform hosting/observability.

## Gap non-blocking untuk staging MVP

- Admin production-order detail penuh belum dibangun.
- Admin upload logo atas nama customer belum aktif.
- Biteship real belum aktif sampai migration 019, env sandbox, origin, dan webhook
  publik lulus smoke test.
- WooCommerce live belum aktif.
- WooCommerce staging activation dapat tetap skipped jika WP staging/env belum tersedia.
- Supabase Auth production belum aktif sampai migration 015, admin pertama, dan
  staging login smoke selesai.

## Prinsip go-live

Jangan deploy production hanya karena build pass. Production boleh dipertimbangkan setelah semua gap kritikal di atas punya owner, env, smoke test, dan rollback plan.

## Task J final release decision

Lihat [production-go-no-go-report.md](./production-go-no-go-report.md) untuk
keputusan terbaru. Per 8 August 2026, staging berstatus `CONDITIONAL_GO`, sedangkan
live production berstatus `NO_GO`. Blocker utama adalah provider payment/shipping
yang masih sandbox, `LEGAL_APPROVAL_STATUS` yang belum `approved`, restore/
monitoring/rollback drill yang belum ditandatangani, dan warning standard variasi
produk. Task J.1 telah menormalkan safety flag lokal dan template menjadi
`STOCK_CUSTOMER_VISIBILITY=false`, `GINEE_TEST_LIVE=false`,
`WOOCOMMERCE_TEST_WRITE=false`, `IPAYMU_TEST_CREATE_PAYMENT=false`, dan
`BITESHIP_TEST_CREATE_SHIPMENT=false`.

Staging tetap boleh `CONDITIONAL_GO` dengan provider sandbox. Live production
harus `NO_GO` bila iPaymu atau Biteship belum live, legal belum approved, stock
customer visibility bukan false, atau write/test-create flag masih aktif.

Tag `v0.1.0-rc1` belum dibuat. Tag hanya boleh dibuat dari commit yang telah
direview, working tree bersih, seluruh migration target terverifikasi, dan
[final-smoke-test.md](./final-smoke-test.md) telah ditandatangani.
# WooCommerce product dan stock monitoring gap

Ginee ditunda. WooCommerce Ofissio menjadi sumber resmi katalog dan stok admin.
Monitoring operasional memakai aliran `WooCommerce Ofissio -> Ofissio Admin`.
Sebelum staging dinyatakan siap:

- terapkan migration `022_woocommerce_stock_monitoring.sql`;
- pastikan semua variasi ukuran WooCommerce memiliki Stock SKU unik;
- pastikan product type variable, atribut Ukuran aktif untuk variation,
  `manage_stock=true`, dan stock quantity tersedia per variation;
- validasi threshold minimum setiap variasi atau nilai default server;
- uji request replenishment idempotent terhadap Supabase staging;
- pastikan customer payload dan UI tidak menampilkan data stok internal.
