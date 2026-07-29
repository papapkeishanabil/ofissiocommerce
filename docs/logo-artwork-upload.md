# Logo and artwork upload

## Format yang didukung

Logo:

- PNG
- JPG/JPEG
- SVG, masih ditandai butuh sanitization

Dokumen/artwork:

- PDF
- XLSX
- PNG
- JPG/JPEG
- SVG untuk artwork, masih perlu sanitization production

## Rekomendasi file logo

- Gunakan PNG transparan.
- Resolusi tinggi / 300 DPI jika tersedia.
- Hindari teks terlalu tipis untuk bordir kecil.
- Maksimum default Phase 12: 10 MB untuk logo.

## Cara upload logo

1. Masuk sebagai customer/company user.
2. Buka dashboard.
3. Gunakan section `Logo library`.
4. Klik `Upload logo`.
5. Logo tersimpan sebagai file private company.

## Cara memilih logo untuk bordir

Di Studio Bordir, upload logo pada zona bordir. Preview lokal muncul cepat di model 3D, lalu sistem menyimpan file ke storage API. Setelah upload sukses, `logoFileId` resmi disimpan ke placement/cart.

## Privasi file customer

File customer tidak disiapkan sebagai public bucket. Production harus memakai signed URL/private object storage.

## Catatan SVG

SVG diterima sebagai foundation, tetapi production perlu sanitization sebelum render/print/bordir.
