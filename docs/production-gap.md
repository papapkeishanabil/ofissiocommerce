# Production gap

Dokumen ini memisahkan **staging foundation complete** dari **production launch ready**.

## Status checkpoint A6

Commercial flow staging telah terbukti dari produk WooCommerce valid, pricing tier/global embroidery, cart, quotation snapshot/override, accept, convert idempotent, order notification, email mock, dan Ofistant. Gap di bawah tetap menjadi blocker production; kelulusan A6 tidak mengaktifkan provider live.

## Gap kritikal sebelum production

1. Real auth dan session production
   - Ganti mock customer auth dengan provider production.
   - Ganti mock internal admin guard dengan auth internal yang benar.
   - Terapkan role mapping customer/admin dari database, bukan header mock.

2. iPaymu live/sandbox activation
   - Isi `IPAYMU_API_KEY`, `IPAYMU_VA`, `IPAYMU_BASE_URL`, dan callback secret di secret manager.
   - Uji create payment sandbox.
   - Uji callback signature valid/invalid.
   - Pastikan return URL tidak pernah menandai paid.
   - Pastikan QR payment invoice benar-benar scannable.

3. Resend live email
   - Verify sender domain.
   - Aktifkan `EMAIL_PROVIDER=resend` dan `EMAIL_ENABLED=true` di staging dulu.
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

5. Shipping provider
   - Pilih provider ekspedisi.
   - Implement provider adapter untuk booking/tracking real.
   - Simpan credential server-side.
   - Pertahankan fallback shipment manual.

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
   - Privacy Policy.
   - Terms & Conditions.
   - Refund/return policy.
   - Contact/support page.
   - CSP review untuk GLB, storage signed URL, dan payment redirect.

## Gap non-blocking untuk staging MVP

- Admin production-order detail penuh belum dibangun.
- Admin upload logo atas nama customer belum aktif.
- Shipping API real belum aktif.
- WooCommerce live belum aktif.
- WooCommerce staging activation dapat tetap skipped jika WP staging/env belum tersedia.
- Auth production belum aktif.

## Prinsip go-live

Jangan deploy production hanya karena build pass. Production boleh dipertimbangkan setelah semua gap kritikal di atas punya owner, env, smoke test, dan rollback plan.
