# Rollback SOP

## Kapan rollback dipicu

Rollback dipertimbangkan bila deploy menyebabkan login gagal massal, data lintas perusahaan terlihat, payment callback salah, order/PDF hilang, shipment ganda, error rate kritis, atau operasi admin tidak dapat dilanjutkan.

## Peran

- Incident commander: memutuskan freeze, rollback, dan selesai incident.
- Application owner: rollback aplikasi dan memeriksa health/build.
- Data owner: mengamankan snapshot dan memutuskan restore data.
- Operations lead: rekonsiliasi order/payment/shipment dan komunikasi internal.
- Customer communication owner: mengirim pemberitahuan jika dampak ke customer terkonfirmasi.

## Langkah cepat

1. Catat waktu mulai, versi deploy, symptom, route/provider terdampak, dan owner.
2. Freeze deploy serta aksi write berisiko. Jangan menghapus data atau callback.
3. Simpan log aman dan snapshot database/storage sebelum tindakan korektif.
4. Jika hanya kode bermasalah, rollback ke release artifact/commit terakhir yang telah lulus staging.
5. Jika migration backward-compatible, biarkan schema dan rollback aplikasi. Jangan menjalankan down migration destruktif tanpa backup dan review.
6. Jika data korup, lakukan restore staging lebih dahulu sesuai `backup-and-restore.md`.
7. Pulihkan production dengan approval incident commander.
8. Jalankan smoke test dan rekonsiliasi.

## Rollback environment dan migration

- Pulihkan konfigurasi dari version history secret manager yang sudah diketahui
  aman; jangan menyimpan atau memulihkan nilai secret dari Git/chat/screenshot.
- Bandingkan nama key dan mode provider sebelum restart. Jangan mencetak nilainya
  pada incident log.
- Untuk migration backward-compatible, rollback aplikasi terlebih dahulu dan
  biarkan kolom/tabel tambahan. Down migration/destructive DDL hanya boleh
  dilakukan setelah backup, restore rehearsal, dan approval data owner.
- Jika release lama tidak kompatibel dengan schema baru, deploy compatibility
  patch atau restore database ke staging lebih dahulu sebelum production.

## Emergency controls

| Area | Mitigasi sementara |
| --- | --- |
| Payment | set `IPAYMU_ENABLED=false`, blok create-payment pada ingress/maintenance mode, pertahankan callback log untuk rekonsiliasi |
| Shipping | set `BITESHIP_ENABLED=false`, blok create-shipment provider, gunakan shipment manual terverifikasi |
| Woo write | set `WOOCOMMERCE_SYNC_ORDERS=false` dan `WOOCOMMERCE_TEST_WRITE=false`; order Ofissio tetap source operasional |
| Order/quotation write | aktifkan maintenance/routing rule pada hosting untuk endpoint write terdampak; endpoint read/status tetap tersedia bila aman |
| Email | set `EMAIL_ENABLED=false` bila terjadi pengiriman berulang; jangan hapus email log |

Perubahan env darurat harus dicatat dengan waktu, pelaksana, approver, alasan,
dan rencana pemulihan. Restart/deploy ulang mengikuti prosedur hosting.

## Provider fallback

- Payment: hentikan create payment baru bila verifikasi callback diragukan; jangan mark paid manual dari return URL.
- Shipping: gunakan shipment manual yang terverifikasi; jangan memanggil create shipment berulang.
- Email: hentikan retry otomatis jika berisiko duplikat; gunakan email log sebagai dasar rekonsiliasi.
- WooCommerce: pertahankan order Ofissio dan tandai sync pending/failed; retry idempotent setelah koneksi pulih.
- Storage: pertahankan metadata database; signed URL dapat dibuat ulang setelah bucket pulih.

## Smoke test pasca-rollback

```bash
npm run check:env
npm run check:production-readiness
npm run check:payment
npm run check:shipping
npm run typecheck
```

Verifikasi manual: `/api/health`, login customer/admin, katalog, detail produk, quotation, order detail, PDF, callback sandbox/mock, shipment/tracking, serta akses file company-scoped.

## Rekonsiliasi

- Cocokkan order sejak waktu incident dengan WooCommerce.
- Cocokkan payment reference/status dengan iPaymu; callback duplicate harus tetap idempotent.
- Cocokkan shipment/waybill dengan Biteship dan shipment manual.
- Cek email log sent/failed agar tidak mengirim dokumen ganda.
- Cek audit log untuk tindakan admin selama incident.

## Penutupan

Incident ditutup setelah health stabil, backlog provider direkonsiliasi, customer terdampak ditangani, dan post-incident review memiliki action owner serta due date. Rotasi secret bila ada kemungkinan exposure.

## Daftar kontak incident

Isi sebelum production dan simpan di runbook internal (bukan repository publik):

- Business owner:
- Incident commander / engineering owner:
- Operations lead:
- Finance/payment reconciliation:
- Warehouse/shipping:
- Customer communication/support:
- Supabase support/project owner:
- iPaymu merchant support:
- Biteship support:
- Hosting/DNS owner:
