# Pemesanan bordir tanpa model 3D

Status: implementasi lokal, belum deploy.

Semua produk Ofissio menerima bordir. Ketersediaan model 3D menentukan cara preview, bukan kemampuan pemesanan. Produk dengan GLB tetap menggunakan Studio 3D. Produk tanpa GLB menggunakan panel **Tambahkan bordir** pada halaman detail.

## Customer

- Pilih posisi, lalu unggah logo atau isi tulisan/nama. Setiap posisi mempunyai file, ukuran, dan catatan sendiri.
- Logo yang telah disimpan pada posisi lain dapat digunakan kembali tanpa unggah ulang.
- Pilih **Rekomendasikan oleh Ofissio** atau **Atur ukuran sendiri**. Rekomendasi disimpan sebagai `sizingMode: "ofissio"` dengan `widthCm` dan `heightCm` bernilai `null`, bukan angka perkiraan.
- Ukuran sendiri mengikuti batas master tiap zona. MOQ dan harga mengikuti master yang sudah digunakan Studio 3D.
- Pengaturan yang belum disimpan atau unggahan yang masih berjalan memblokir penambahan ke keranjang. Kegagalan mengganti file tidak menghapus posisi yang sudah disimpan.
- Tambah/edit dari keranjang memuat kembali file, catatan, ukuran, dan pembagian nama. Mengedit item mengganti item tersebut tanpa menggandakan jumlah.

## Penyimpanan dan admin

Instruksi disimpan pada `embroideryPlacements`, terpisah dari `uniform3DConfig`. Referensi file menggunakan ID penyimpanan milik customer, bukan URL blob browser. Checkout memeriksa kepemilikan, jenis, dan status file; nama file diambil dari data penyimpanan yang sah. File pending, ditolak, dihapus, atau milik customer lain tidak dapat digunakan.

Produk/warna/jumlah per ukuran, logo tiap posisi, tulisan/nama beserta pembagiannya, keputusan ukuran, catatan per posisi, dan catatan pesanan diteruskan ke snapshot checkout, quotation/order, metadata WooCommerce, serta perintah kerja. Tampilan admin menyediakan tautan lihat/unduh file dengan URL bertanda tangan yang diperbarui saat halaman dimuat. Tulisan/nama ditampilkan sebagai data terstruktur, bukan file palsu.

Label ukuran rekomendasi dipertahankan pada ringkasan customer, admin, tracking, email, dan dokumen. Catatan panjang/daftar nama pada dokumen kerja dibungkus dan dapat berlanjut ke halaman berikutnya. Instruksi customer asli tetap disimpan meski tim sudah mencatat ukuran final.

## Konfirmasi sebelum produksi

Pesanan dengan bordir tanpa model 3D atau ukuran yang diserahkan kepada Ofissio mendapat task **Konfirmasi ukuran dan mockup bordir dengan customer**. Admin mencatat ukuran final per posisi, referensi mockup (file/link), serta siapa, kapan, dan melalui kanal apa customer menyetujui. Ini pencatatan konfirmasi oleh admin, bukan portal persetujuan customer otomatis.

Task konfirmasi tidak dapat diselesaikan tanpa catatan. Task produksi berikutnya dan penyelesaian perintah kerja diblokir hingga konfirmasi selesai. Catatan persetujuan dicantumkan pada dokumen kerja. Pengaturan ini berlaku pada perintah kerja baru; tidak menambah task pada order lama secara otomatis.

Checkout mempertahankan alur permintaan estimasi untuk pekerjaan custom. API pembayaran juga menolak pembayaran jika ada tarif bordir yang belum tersedia sehingga biaya yang belum dikonfirmasi tidak dianggap gratis.

Tidak memerlukan migrasi: placement dan catatan sudah menggunakan kolom JSON yang ada, dan task key menggunakan kolom teks. Tidak ada perubahan data produk massal. Flag bordir lama tidak lagi membatasi storefront; penyimpanan produk berikutnya mencatat kemampuan bordir sebagai aktif. Zona kosong menggunakan enam posisi standar; konfigurasi zona produk tetap dipakai untuk produk tanpa GLB, sedangkan cakupan Studio 3D yang sudah ada dipertahankan.

## Verifikasi

- `npx tsx --require ./scripts/register-server-only.cjs scripts/test-embroidery-without-3d.ts`: fixture server/client, perhitungan, isolasi file, snapshot admin/WooCommerce/PDF, penggantian item, konfirmasi produksi, serta penolakan pembayaran tanpa harga. Akses jaringan eksternal ditolak selama tes.
- `npx tsx --require ./scripts/register-server-only.cjs scripts/test-embroidery-pricing.ts`: regresi tarif dan Studio 3D.
- Jalankan dev server lokal pada port 8029, lalu `python scripts/webtest-embroidery-without-3d.py`: halaman fixture sementara, API sesi/unggahan dipalsukan; desktop 1440 dan mobile 390/320. Tidak membuat pesanan atau unggahan nyata. Fixture dibersihkan otomatis jika dibuat oleh skrip.
- TypeScript dan lint pada seluruh file yang berubah.

Screenshot dan bukti pemeriksaan: `artifacts/embroidery-without-3d/`.
