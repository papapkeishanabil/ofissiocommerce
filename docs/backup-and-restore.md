# Backup and restore Ofissio

Dokumen ini adalah SOP operasional backup dan pemulihan. Backup dianggap valid hanya setelah restore drill berhasil; keberadaan file backup saja tidak cukup.

## Cakupan data

| Data | Sumber | Metode utama | Prioritas |
| --- | --- | --- | --- |
| Database transaksi | Supabase PostgreSQL | managed backup + export terenkripsi | kritis |
| Logo/artwork customer | Supabase Storage private | bucket replication/export | kritis |
| PDF quotation/invoice | Supabase Storage private | bucket replication/export | tinggi |
| Model GLB | Supabase Storage private | bucket replication + salinan master offline | tinggi |
| Produk, variasi, foto | WooCommerce/WordPress | database + Media Library export | tinggi |
| Konfigurasi env | secret manager | template key tanpa nilai secret | kritis |

Jangan memasukkan password, service-role key, API key, token, atau application password ke arsip repository. Backup secret dilakukan oleh pemilik secret manager dengan akses terbatas dan audit trail.

## Jadwal dan retensi

- Database automated backup: harian, retensi minimum 14 hari.
- Snapshot mingguan: 8 minggu.
- Snapshot bulanan: 12 bulan atau sesuai kebijakan pajak/kontrak.
- Storage object inventory: harian; salinan lintas lokasi minimal mingguan.
- GLB master dan media produk: setiap perubahan material atau sebelum publish besar.
- WooCommerce database/media: harian dan sebelum update plugin/WordPress.
- Restore drill: minimal per kuartal dan setelah migrasi schema besar.

Owner operasional menetapkan RPO/RTO final. Target awal staging: RPO 24 jam dan RTO 8 jam; target production harus disetujui bisnis sebelum go-live.

## Backup Supabase Database

1. Verifikasi backup terjadwal aktif pada project yang benar.
2. Catat project ref, waktu snapshot, versi schema/migration terakhir, dan checksum export.
3. Simpan export terenkripsi pada lokasi terpisah dari project Supabase utama.
4. Jangan menyalin production ke laptop pribadi atau staging tanpa masking data customer.
5. Arsipkan output `npm run check:supabase` dan `npm run check:rls` bersama bukti backup.

## Backup Supabase Storage

Bucket wajib private:

- `ofissio-logos`
- `ofissio-artwork`
- `ofissio-documents`
- `ofissio-3d-models`

Export harus mempertahankan object key, MIME type, ukuran, checksum, dan metadata relasi. Signed URL tidak dibackup karena bersifat sementara. Untuk logo/artwork customer, akses dan hasil restore wajib tetap company-scoped.

## Backup konfigurasi

- Simpan `.env.example` dan `docs/env.md` sebagai daftar key, bukan sebagai backup nilai.
- Simpan nilai production di secret manager dengan version history dan MFA.
- Catat owner, tanggal rotasi, dan layanan yang memakai setiap secret.
- Setelah restore/incident, rotasi credential yang mungkin terekspos.

## Optional WooCommerce export

WooCommerce adalah sumber resmi katalog Ofissio. Backup opsional namun sangat disarankan mencakup:

- products, variations, Parent SKU dan Variation SKU;
- attribute Ukuran, harga, kategori, dan metadata Ofissio;
- database WordPress/WooCommerce;
- WordPress Media Library;
- daftar plugin/versi serta konfigurasi permalink.

Jangan mengandalkan CSV produk saja karena media, metadata plugin, dan relasi variasi dapat tidak lengkap.

## Prosedur restore ke staging

1. Nyatakan incident/drill, tentukan restore point, dan hentikan write test ke target.
2. Restore database ke project staging terisolasi.
3. Restore bucket dengan struktur key yang sama; pastikan semuanya private.
4. Isi credential staging melalui secret manager, bukan file repository.
5. Jalankan migration yang lebih baru hanya setelah schema hasil restore dicatat.
6. Jalankan validasi:

```bash
npm run check:env
npm run check:supabase
npm run check:storage
npm run check:rls
npm run check:production-readiness
```

7. Uji login dan company isolation.
8. Uji satu quotation, PDF, order, payment callback mock/sandbox, shipment, dan tracking.
9. Verifikasi logo customer lain tidak dapat diakses.
10. Bandingkan count tabel, checksum object, serta sampel dokumen sebelum menyatakan restore berhasil.

## Restore production

Restore production hanya dilakukan oleh incident commander setelah restore staging lolos. Freeze deployment dan write operasional, komunikasikan downtime, ambil snapshot kondisi terakhir, lalu ikuti `docs/rollback-sop.md`. Setelah restore, lakukan rekonsiliasi order, payment, callback, email, dan shipment sejak restore point agar tidak ada transaksi yang hilang atau diproses ganda.

## Known limitations

- Backup/restore terotomasi lintas project belum diorkestrasi dari repository ini.
- Retensi akhir harus disesuaikan dengan kontrak, pajak, privasi, dan kapasitas penyimpanan.
- Export WooCommerce tidak menggantikan backup penuh WordPress database dan Media Library.
- Restore drill dengan data production membutuhkan masking dan persetujuan akses.
