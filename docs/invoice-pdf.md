# Invoice PDF

Invoice PDF Phase 22 memakai template default `invoice_ofissio_custom`, dibuat mengikuti referensi invoice Ofissio yang diberikan user.

## Template custom Ofissio

Elemen layout utama:

- Header logo text `OFISSIO` dan tagline `WORKWEAR & UNIFORM`.
- Badge status pembayaran di kanan atas.
- Hero section navy dengan aksen kuning.
- Area `Invoice To`.
- Judul besar `INVOICE`.
- Invoice No, Date, Due, Order Number, dan Quotation Number jika tersedia.
- Location label: `Kabupaten Bandung, Indonesia`.
- Payment method: `Bayar via iPaymu` jika provider iPaymu; placeholder aman jika payment masih mock.
- QR/payment link hanya ditampilkan jika data benar-benar tersedia.
- Phase 23 menambahkan payment reference, expiry, unique code, dan QR metadata dari payment record.
- Amount in words bahasa Indonesia.
- Tabel item: No, Description, Harga Satuan, Qty, Total.
- Summary: Sub-total, Kode Unik, DPP, PPN 11%, Total.
- Total box navy.
- Terms & Conditions.
- Thank you section.
- Signature block: Triyadi Yuwono, Direktur.
- Footer: TEL, WEB `www.ofissio.com`, EMAIL `halo@ofissio.com`.

## Payment status badge

- `BELUM LUNAS`: unpaid/waiting payment.
- `LUNAS`: paid.
- `DIBATALKAN`: cancelled.
- `GAGAL`: failed.

Invoice tidak boleh menampilkan status `LUNAS` jika payment record belum `paid`.

## Pajak dan amount in words

- Helper `amountToIndonesianWords()` menghitung teks rupiah dari grand total.
- Nilai desimal dibulatkan ke rupiah terdekat untuk teks terbilang.
- DPP/PPN memakai data order jika tersedia; jika belum ada, fallback aman mengikuti total foundation.

## Security

- Internal notes, audit logs, margin/modal, replenishment internal, storage key, dan provider internals tidak masuk invoice customer.
- Payment link/QR tidak dikarang.
- Download customer memakai signed URL company-scoped.

## Known limitation

- Layout belum 100% pixel-perfect dari file referensi.
- QR iPaymu belum dirender sebagai gambar scannable di PDF sampai renderer image/QR dependency diaktifkan.
- Jika iPaymu baru mengembalikan payment URL, invoice menampilkan link dan QR placeholder aman, bukan QR palsu.
- Faktur pajak resmi dan e-signature legal belum termasuk.
- Multi-page table memakai renderer foundation sederhana.
