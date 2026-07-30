# Production gap

Dokumen ini memisahkan **staging foundation complete** dari **production launch ready**.

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

4. WooCommerce staging/live integration
   - Isi WooCommerce URL/key/secret di server secret manager.
   - Uji product source WooCommerce.
   - Pastikan hanya produk published dengan GLB valid yang tampil.
   - Uji order sync idempotent.
   - Pastikan secret WooCommerce tidak muncul di client bundle.

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
- Auth production belum aktif.

## Prinsip go-live

Jangan deploy production hanya karena build pass. Production boleh dipertimbangkan setelah semua gap kritikal di atas punya owner, env, smoke test, dan rollback plan.

