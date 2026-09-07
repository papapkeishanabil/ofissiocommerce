# Admin quotation workflow

Phase 17 membuat workflow quotation internal yang lebih nyata untuk sales.

## Flow utama

1. Customer submit request quotation.
2. Sistem menyimpan quotation, quotation items, email log, dan audit log.
3. Sales membuka `/admin/quotations`.
4. Sales membuka detail `/admin/quotations/[id]`.
5. Sales review company, PIC, notes, size matrix, model 3D, logo placement, dan logo file id.
6. Sales mark quotation menjadi `under_review`.
7. Sales mengisi pricing per item, tax, shipping estimate, customer message, sales notes, dan valid until.
8. Backend menghitung subtotal dan grand total server-side.
9. Sales mark `quoted`.
10. Sales menjalankan `send_quote_to_customer` jika ingin mengirim/mencatat notifikasi.
11. Customer membuka `/quotes/[id]`.
12. Customer accept, reject, atau request revision.
13. Jika quotation accepted, admin convert quotation menjadi order Ofissio foundation.
14. Order hasil convert muncul di admin orders, customer dashboard, dan tracking.

## Lembar Approval Desain (Full Custom)

Untuk quotation `source=custom_request` (brief sales-assisted), detail page menampilkan panel **Tanda tangan & revisi brief** sebelum pricing dibuka:

1. Sales mengisi brief lewat form sales-assisted (gender per size, measurements per spec, area bordir A/B/C, catatan custom, No. PO di field referensi). Checkbox **Minta tanda tangan customer** (default ON) berlaku per kasus di semua kanal — hilangkan centang untuk repeat order dengan desain yang sudah disetujui → status `not_required`, pricing langsung terbuka tanpa lembar approval. Form otomatis memperingatkan bila customer terpilih sudah punya permintaan Full Custom yang belum selesai (hindari brief ganda).
2. Upload figur mockup depan/belakang per garment langsung dari panel (JPG/PNG ≤10 MB) — file disimpan sebagai artwork dengan purpose `design_approval_figure`.
3. Internal Desain/Produksi menandatangani dari panel (nama + jabatan) — tidak memblokir gate.
4. Kirim link approval (`/briefs/[id]`) ke customer; customer approve (nama + jabatan + centang klausa) atau minta revisi.
5. Edit brief hanya bisa sebelum approval customer; setiap perubahan mencabut ttd aktif dan mengembalikan status ke menunggu persetujuan.
6. Generate **Lembar Approval Desain PDF** dari section Documents (A4 landscape per garment; auto-regenerate saat revisi/ttd/figur berubah).
7. PWO tetap terkunci sampai brief approved customer (atau sales memilih `not_required` per kasus) — gate tidak berubah.

### Brief asal customer portal

Quotation yang customer kirim sendiri dari `/custom-request` menampilkan kartu **Kembangkan brief teknis** (bukan panel ttd) selama belum diambil alih:

1. Setelah follow-up ke customer dan konsultasi internal (desainer/kepala produksi), tekan **Kembangkan brief teknis** — permintaan awal customer otomatis di-snapshot sebagai pembanding.
2. Isi brief teknis (garment, ukuran per gender, area bordir, figur) lewat editor seperti biasa; ttd internal Desain/Produksi juga tersedia.
3. Saat menyimpan, centang **Minta tanda tangan customer** (default) bila perlu lembar approval berttd; hilangkan centang untuk kasus sederhana agar pricing langsung terbuka (`not_required`).
4. Bila minta ttd: kirim link `/briefs/[id]` — customer melihat blok **Permintaan awal Anda** di atas lembar desain teknis, lalu approve/minta revisi. Revisi tidak menurunkan status quotation ke draft.

## Batasan Phase 17

- PDF quotation belum dibuat.
- WooCommerce live order sync belum aktif.
- Payment tetap mock/foundation.
- Shipping tetap mock/manual.
- Admin auth masih mock/internal placeholder.
