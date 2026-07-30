# Quotation PDF

Quotation PDF adalah dokumen penawaran resmi Ofissio yang dibuat server-side dari data quotation.

## Isi dokumen

- Header OFISSIO / Workwear & Uniform.
- Judul `QUOTATION / PENAWARAN`.
- Nomor quotation, tanggal, valid until, dan status.
- Company/customer: nama perusahaan, PIC, email, WhatsApp, alamat jika tersedia.
- Item: produk, SKU, warna, size matrix, total qty, harga satuan, diskon, subtotal.
- Ringkasan custom: titik bordir/logo, file logo, dan catatan customer.
- Total: subtotal, diskon, pajak/PPN, estimasi shipping, grand total.
- Terms penawaran.
- Footer kontak Ofissio dan timestamp generated.

## Aturan final/draft

- PDF final hanya untuk quotation `quoted`, `accepted`, atau `converted_to_order`.
- Quotation yang belum final tidak boleh diberi label penawaran final.
- Admin dapat menggunakan opsi draft jika diperlukan untuk preview internal.
- Internal notes tidak masuk PDF.

## Download

- Admin generate/download lewat `/admin/quotations/[id]`.
- Customer download dari `/quotes/[id]` jika dokumen sudah tersedia.
- Customer company mismatch harus ditolak.

## Known limitation

- Format penawaran belum punya template visual custom sebanyak invoice.
- Valid until memakai fallback aman jika quotation belum memiliki expiry eksplisit.
- Attachment PDF di email belum aktif; email mengarahkan ke portal quotation.
