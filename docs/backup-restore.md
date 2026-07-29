# Backup and restore plan

Saat ini Ofissio masih memakai mock/in-memory untuk beberapa area. Dokumen ini adalah rencana production, bukan implementasi database/storage production.

## Database backup

- Gunakan managed database dengan automated daily backup.
- Simpan weekly dan monthly snapshot.
- Test restore minimal sebelum production launch dan setelah perubahan schema besar.

## Storage backup

Backup object storage untuk:

- GLB model produk.
- Logo upload customer.
- Artwork bordir final.
- Invoice.
- Quotation.
- Dokumen surat jalan.

## WooCommerce / WordPress backup

- Backup database WordPress/WooCommerce harian.
- Backup media library.
- Backup plugin bridge Ofissio.
- Catat versi WooCommerce dan plugin aktif.

## Secret backup policy

- Secret disimpan di password manager atau secret manager.
- Tidak ada secret di Git, screenshot, chat, atau dokumen publik.
- Rotasi secret setelah incident atau akses tim berubah.

## Retention

- Daily: 14 hari.
- Weekly: 8 minggu.
- Monthly: 12 bulan.

Retention final perlu disesuaikan dengan kebijakan bisnis dan regulasi.

## Restore test checklist

- Restore database ke staging.
- Restore object storage subset.
- Buka katalog.
- Buka detail produk dengan GLB.
- Test checkout mock.
- Test tracking order.
- Test quotation/email.
- Test WooCommerce sync foundation.

## Akses backup

- Owner bisnis.
- Lead engineering/ops.
- Admin production terbatas.

Gunakan MFA dan audit trail untuk akses backup.

## Disaster recovery sederhana

1. Freeze deploy.
2. Identifikasi versi aplikasi dan data terakhir yang aman.
3. Restore database/storage ke staging.
4. Smoke test.
5. Restore production atau rollback aplikasi.
6. Verifikasi order/payment/tracking.
7. Buat incident note dan action item.
