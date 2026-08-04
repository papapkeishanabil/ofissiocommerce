# Seragam Full Custom

Jalur Full Custom dipakai ketika customer belum memilih produk katalog karena produk memang akan dirancang dari awal.

## Kapan customer memakai jalur ini

Customer memilih **Buat Seragam Full Custom** apabila membutuhkan salah satu dari hal berikut:

- desain atau referensi model sendiri;
- jenis bahan, gramasi, atau konstruksi sendiri;
- pola dan size chart perusahaan sendiri;
- kombinasi warna atau panel khusus;
- fungsi teknis khusus yang tidak tersedia di katalog;
- proses sample dan approval desain sebelum produksi massal.

Jika customer hanya membutuhkan produk yang tersedia tanpa modifikasi, gunakan katalog dan route fulfillment. Jika customer memilih produk katalog lalu menambahkan bordir, sablon, DTF, atau nama, gunakan route customization.

## Alur customer

1. Customer membuka `/custom-request` dari beranda, katalog, halaman quotation kosong, atau Ofistant.
2. Customer mengisi nama proyek, jenis pakaian, estimasi jumlah, serta kebutuhan desain.
3. Customer dapat menambahkan preferensi bahan, warna, size chart, target waktu, dan maksimal lima file referensi.
4. Saat mengirim, customer harus masuk atau mendaftar sebagai akun perusahaan.
5. Sistem membuat quotation dengan `source=custom_request`, `requirementType=custom_production`, dan `requestedProcessRoute=production`.
6. Harga awal sengaja belum final. Sales menilai feasibility, bahan, pola, harga, dan jadwal sebelum mengirim penawaran.
7. Setelah quotation diterima customer dan dikonversi menjadi order, sistem memakai route Production Order / SPK.

## Data dan keamanan file

- Request customer tidak mempercayai `companyId` dari body; company scope berasal dari session server.
- File referensi harus bertipe artwork, dimiliki company yang sama, dan tidak berstatus deleted/rejected.
- UI customer dan admin hanya menampilkan nama file, bukan storage key atau service-role credential.
- File yang sudah dihubungkan ke quotation ditandai used.
- File yang diupload tetapi request belum dikirim masih dapat menjadi file artwork yang belum terhubung. Cleanup file abandoned belum diotomatisasi pada implementasi ini.

## Persiapan database

Jalankan migration berikut secara manual di Supabase SQL Editor sebelum mengaktifkan request Full Custom pada database live:

```text
database/migrations/016_custom_quotation_request.sql
```

Migration menambahkan `custom_request` sebagai nilai valid pada kolom `quotations.source`. Migration tidak mengubah produk KK-006 maupun file `/3d/kk-006.glb`.

## Smoke test manual

1. Buka `/custom-request` pada desktop dan mobile.
2. Pastikan penjelasan membedakan katalog dan Full Custom.
3. Coba kirim form kosong; fokus harus berpindah ke field wajib pertama.
4. Isi nama proyek, jenis pakaian, jumlah, dan deskripsi minimal sepuluh karakter.
5. Upload JPG/PNG/PDF yang valid dan pastikan hanya nama file tampil.
6. Kirim request dengan akun perusahaan yang memiliki permission quotation.
7. Pastikan quotation muncul di `/admin/quotations` sebagai Brief Full Custom dengan route Production / SPK.
8. Pastikan admin dapat mengisi harga final sebelum tombol kirim penawaran aktif.
9. Pastikan halaman customer tidak menampilkan size matrix produk katalog untuk request ini.
