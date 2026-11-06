# Melanjutkan bordir setelah login

Tombol **Masuk / Daftar** pada area unggah logo menggunakan CSS eksplisit navy/putih. Warna tidak lagi tergantung pada variabel yang hanya didefinisikan di shell Studio 3D.

Login dari unggah logo, maupun tombol Masuk di header halaman produk, menggunakan intent `save_configuration` dan alamat produk saat ini. Login email pada modal mempertahankan komponen produk. Login Google membawa alamat produk sebagai `next`, termasuk query varian/line yang sudah ada; parameter `next` lain pada URL produk tidak mengambil alih tujuan ini. Alur checkout dan quotation yang memang diminta tetap menggunakan tujuan masing-masing.

Sebelum modal dibuka, halaman menyimpan kelanjutan konfigurasi pada `sessionStorage` tab yang sama: pilihan produk/varian, jumlah per ukuran, catatan pesanan, posisi bordir yang tersimpan, serta posisi dan draft yang sedang diedit. URL blob sementara tidak disimpan. Data hanya dipulihkan untuk alamat produk/query yang sama, divalidasi dengan schema, dan berlaku maksimal 30 menit.

Setelah sesi login berhasil, posisi gulir pada `[data-workspace-scroll]` dipulihkan berdasarkan offset editor. Penyimpanan sementara dibersihkan setelah pemulihan. Tidak ada password atau token sesi di dalam data kelanjutan ini.

Kolom pemesanan berada dalam alur halaman normal, tanpa `sticky`, dan menggunakan `overflow-anchor: none`. Sebelumnya, kolom sticky yang bertambah tinggi dapat bergeser ke atas sementara posisi gulir dan deskripsi kiri tetap; akibatnya tombol posisi dan awal editor menghilang dari layar.

Pemilihan posisi membawa fokus ke judul editor dengan `preventScroll`. Panel tetap di tempat ketika tombol posisi dan awal editor sudah terlihat. Jika diperlukan, halaman menggulir secukupnya ke awal panel, sehingga tombol posisi tetap terlihat di atas form. Setelah disimpan, tampilan kembali ke panel/ringkasan jika diperlukan. Pengaturan reduced motion dihormati. Posisi diurutkan secara konsisten dan disusun dalam tiga kolom di desktop serta dua kolom di HP.

Verifikasi:

- `npx tsx scripts/test-configuration-continuation.ts`: snapshot, data kedaluwarsa/rusak, pemisahan produk, penghapusan blob URL, intent checkout/quote, dan pemulihan gulir.
- `python scripts/webtest-embroidery-login.py` dengan dev server pada port 8029: API login/daftar/Google dipalsukan, tanpa membuat akun atau mengunggah file nyata. Mencakup login gagal lalu berhasil, OAuth dengan pemuatan halaman ulang, pendaftaran, header login, ukuran/catatan/posisi tersimpan, serta gulir desktop 1440 dan mobile 390/320. Route fixture dibersihkan jika dibuat oleh skrip.
- `python scripts/webtest-embroidery-scroll.py`: deskripsi kiri panjang, buka Dada Kiri lalu Dada Kanan pada lebar 1920/1440/390/320. Memeriksa posisi panel dan gulir tidak berubah, tombol posisi dan judul editor terlihat, tanpa overflow horizontal atau penulisan API nyata. Route fixture sementara dibersihkan setelah pengujian.

Bukti pengujian dan screenshot berada di `artifacts/embroidery-login-continuation/`. Pengujian OAuth ini memeriksa tujuan redirect dan pemulihan aplikasi; tidak menggunakan kredensial Google nyata.
