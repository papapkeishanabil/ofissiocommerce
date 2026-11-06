# Ofistant: pemilihan Knowledge Base berdasarkan makna

Patch ini memeriksa pertanyaan sebelum aturan kata kunci HELP, pembelian,
dan konfigurator. Pertanyaan tidak perlu sama dengan contoh pada artikel.
Model menerima pertanyaan terbaru, maksimal 10 pesan percakapan sebelumnya,
dan artikel Published. Riwayat hanya membantu memahami rujukan; bukan sumber
ketentuan bisnis.

Model memilih salah satu hasil:

- Artikel resmi menjawab pertanyaan: pilih ID artikel dan kutip bukti.
- Permintaan aplikasi: teruskan ke alur katalog, harga, pengiriman, atau pesanan.
- Maksud belum jelas: minta penjelasan.
- Informasi tidak tersedia: sampaikan keterbatasan dan tawarkan bantuan tim.
- Obrolan santai: pilih jenis tanggapan yang sesuai nada percakapan, tanpa tindakan
  aplikasi atau tombol promosi. Balasan singkat diambil dari variasi teks yang
  dikendalikan server; model tidak menulis klaim produk atau petunjuk berbahaya.

Candaan berulang menggunakan variasi yang belum dipakai dalam riwayat terbaru.
Ketika variasi habis, balasan tidak mengulang respons tepat sebelumnya.
Permintaan bisnis dalam pesan bercanda tetap diproses sebagai Knowledge Base
atau tindakan aplikasi. Pesan serius mendapat nada serius; indikasi bahaya atau
tekanan emosional ditanggapi dengan empati dan tanpa humor.

Pesan yang memuat beberapa pertanyaan diuraikan terlebih dahulu. Masing-masing
dinilai tersendiri; satu bagian yang tidak terjawab atau masih ambigu mencegah
jawaban parsial ditampilkan sebagai jawaban lengkap.

Server memvalidasi ID, status Published, dan kutipan terhadap jawaban tersimpan.
Balasan menggunakan seluruh jawaban resmi, bukan teks bisnis yang ditulis model.
Tidak ada tindakan keranjang dari hasil Knowledge Base. Validasi kutipan
membatasi sumber fakta, tetapi ketepatan pemilihan artikel tetap bergantung
pada model; pengujian variasi makna perlu dipertahankan.

Artikel dibaca ulang tanpa cache pada setiap pemeriksaan. Draft/Archived tidak
digunakan. Tidak ada pemotongan ke 40 artikel terbaru; payload artikel dibatasi
120.000 karakter. Jika batas ini terlampaui, sistem menyampaikan bahwa informasi
belum dapat diperiksa. KB yang lebih besar memerlukan strategi retrieval
tambahan sebelum batas tersebut dinaikkan.

Gunakan konfigurasi GEMINI_MODEL dan GEMINI_API_KEY yang sudah tersedia.
Model tidak dipilih/diganti otomatis. Batas waktu panggilan model 15 detik,
tanpa retry otomatis. Konfigurasi hilang, gangguan database, kegagalan model,
atau bukti tidak valid menghasilkan respons keterbatasan, bukan jawaban FAQ
dari aturan generik. Perintah navigasi eksplisit seperti Lihat katalog dan
Bantuan tim Ofissio dapat langsung melewati pemeriksaan Knowledge Base.
Permintaan aplikasi yang tidak dikenali aturan juga meminta klarifikasi;
endpoint tidak lagi membuka jalur generasi jawaban faktual bebas sebagai fallback.

Pemeriksaan semantik menambah panggilan model untuk pesan yang bukan pintasan
navigasi. Kuota dan latensi provider harus diperhitungkan; saat validasi,
provider mengembalikan batas free tier 15 permintaan per menit. Patch tidak
mengubah kuota, paket layanan, atau kredensial.

## Validasi

Tes deterministik menguji kontrak bukti, status publikasi, perubahan jawaban,
riwayat, artikel setelah urutan ke-40, kegagalan dependency, serta endpoint
chat sebenarnya dengan database/model tiruan. Tes tidak menulis data customer.

```sh
node node_modules/tsx/dist/cli.mjs --require ./scripts/register-server-only.cjs scripts/test-ofistant-knowledge.ts
```

Tes model memakai artikel fixture dan konfigurasi AI lingkungan setempat,
dengan jeda untuk menghindari lonjakan permintaan. Mode ini menggunakan kuota AI.

```sh
node node_modules/tsx/dist/cli.mjs --require ./scripts/register-server-only.cjs scripts/test-ofistant-knowledge.ts --live
```

Untuk obrolan santai dan perpindahan kembali ke kebutuhan bisnis:

```sh
node node_modules/tsx/dist/cli.mjs --require ./scripts/register-server-only.cjs scripts/test-ofistant-conversation.ts
node node_modules/tsx/dist/cli.mjs --require ./scripts/register-server-only.cjs scripts/test-ofistant-conversation.ts --live
```

Validasi UI dilakukan pada preview terpisah, desktop dan mobile, dengan artikel
Published yang sudah disetujui. Release produksi tidak diganti oleh langkah tes.
