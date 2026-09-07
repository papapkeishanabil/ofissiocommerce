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

## Lembar Approval Desain (design approval)

Setelah sales mengisi brief teknis (sales-assisted brief), quotation tidak bisa diproses ke pricing/PWO sebelum customer menyetujui brief. Gate ini memakai `requiresCustomerBriefApproval` dan halaman `/briefs/[id]`. Pilihan **per kasus**: saat membuat maupun mengedit brief, sales dapat menghilangkan centang *Minta tanda tangan customer* — status menjadi `not_required` dan gate langsung terbuka, untuk repeat order dengan desain yang sudah disetujui sebelumnya.

- **Tanda tangan digital** = klik portal + nama + jabatan penandatangan. Customer wajib mencentang klausa persetujuan (`BRIEF_APPROVAL_CONSENT_TEXT`); tanda tangan disimpan di `productionBrief.signatures` dengan `method: "portal_click"`, `signedAt`, dan `revisionNo` saat ditandatangani.
- **Tiga pihak**: `design` dan `production` ditandatangani internal dari panel admin (tidak memblokir gate); `customer` ditandatangani lewat link approval dan membuka gate.
- **Revisi**: customer memilih *Minta revisi* + catatan → `revisionNo` naik, `revisedAt` diisi, semua tanda tangan aktif dicabut (`revokedAt`), status kembali `draft`. Admin juga dapat mengubah brief sebelum approval (status kembali `pending_customer_approval` + ttd dicabut, atau `not_required` bila centang *Minta tanda tangan customer* dilepas).
- **Isi brief per garment**: spesifikasi konstruksi + kolom Ukuran (measurements), area bordir A/B/C (zona, posisi, dimensi cm, teknik, logo), size breakdown dengan kelompok gender (Pria/Wanita/Custom/Umum), figur foto mockup depan/belakang yang diunggah admin, dan catatan custom per ukuran.
- **No. PO klien** memakai field `externalReference` yang sudah ada — jangan buat field baru.
- **PDF Lembar Approval Desain** (`design_approval_sheet_pdf`): A4 landscape, 1 halaman per garment, mengikuti format internal Ofissio (meta + revisi, figur foto, tabel spesifikasi/bordir/qty per gender, catatan custom, 3 blok ttd + klausa). Detail di `docs/pdf-documents.md`.
- Batas dimensi bordir server-side divalidasi per zona (`validatePlacementDimensions`); punggung atas/tengah maksimal 30×8 / 30×20 cm (migration 034).

### Pengayaan brief dari permintaan customer (portal)

Quotation dari `/custom-request` (kanal `customer_portal`) awalnya **tidak** melalui alur approval — permintaan customer dianggap deklarasi kebutuhan. Setelah follow-up sales dan konsultasi internal (desainer, kepala produksi):

- Sales menekan **Kembangkan brief teknis** di detail quotation (`POST /api/admin/quotations/[id]/brief-enrichment`). Permintaan awal customer disimpan sebagai snapshot (`customerRequestSnapshot`) — tidak ditimpa — dan editor brief, upload figur, serta ttd internal menjadi tersedia.
- Saat menyimpan hasil pengayaan, sales **memilih per kasus**: *Minta tanda tangan customer* (default; status `pending_customer_approval`, gate pricing/PWO terkunci) atau tanpa persetujuan formal (`not_required`, gate tetap terbuka).
- Halaman approval customer menampilkan blok **Permintaan awal Anda** sebagai pembanding atas lembar desain teknis.
- Revisi pada jalur ini tidak menurunkan status quotation ke `draft` (quotation sudah `submitted` sejak customer mengirim).
- Jalur customer juga di-strip server-side: payload `/api/quotation/custom-request` tidak bisa menyuntikkan `intakeChannel` internal, `technicalSpecifications`, `customAdjustments`, atau `externalReference`.

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
