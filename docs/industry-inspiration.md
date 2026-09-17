# Inspirasi industri — panduan serah-terima

Status implementasi lokal, 11 September 2026. Fitur memperluas inspirasi ke seluruh 20 industri, termasuk korporasi; tidak mengganti sistem desain situs.

## Untuk pengunjung

Direktori `/inspirasi` membagi halaman menjadi **Bisnis Naik Kelas** dan **Solusi Korporasi**. Tautan industri di bagian homepage `#usaha` menuju inspirasi; halaman korporasi juga menyediakan tautan ke tujuh bidang perusahaan.

| Kelompok | Industri | Rute |
| --- | --- | --- |
| Bisnis | Bengkel & Teknisi | `/inspirasi/bengkel-teknisi` |
| Bisnis | Apotek & Klinik | `/inspirasi/apotek-klinik` |
| Bisnis | Toko & Retail | `/inspirasi/retail` |
| Bisnis | Restoran & Kafe | `/inspirasi/restoran-kafe` |
| Bisnis | Grosir & Distributor | `/inspirasi/grosir` |
| Bisnis | Laundry | `/inspirasi/laundry` |
| Bisnis | Salon & Kecantikan | `/inspirasi/salon` |
| Bisnis | Toko Bangunan | `/inspirasi/toko-bangunan` |
| Bisnis | Toko Sparepart | `/inspirasi/sparepart` |
| Bisnis | Petshop | `/inspirasi/petshop` |
| Bisnis | Ekspedisi & Logistik | `/inspirasi/ekspedisi` |
| Bisnis | Security | `/inspirasi/security` |
| Korporasi | Solusi Korporasi | `/inspirasi/solusi-korporasi` |
| Korporasi | Pertambangan | `/inspirasi/pertambangan` |
| Korporasi | Konstruksi | `/inspirasi/konstruksi` |
| Korporasi | Manufaktur | `/inspirasi/manufaktur` |
| Korporasi | Perhotelan | `/inspirasi/perhotelan` |
| Korporasi | BUMN & Instansi | `/inspirasi/bumn` |
| Korporasi | Maritim | `/inspirasi/maritim` |
| Korporasi | Pendidikan | `/inspirasi/pendidikan` |

Setiap halaman berisi visual, manfaat, dan pilihan produk terbit yang lolos validasi katalog serta sesuai industri. Maksimal enam produk bergambar ditampilkan; “Lihat seluruh produk” membuka katalog dengan filter industri. Bila pilihan bergambar kosong, halaman menawarkan tautan ke seluruh katalog. Jumlah produk bergantung pada data katalog aktif.

Tautan “Kembali ke Bisnis & Korporasi” di bagian atas setiap halaman inspirasi langsung membuka section 02 homepage (`/#usaha`). Logo Ofissio tetap menjadi jalur kembali ke bagian atas homepage.

Halaman baru memisahkan judul dari gambar dan menampilkan gambar utuh. Pada desktop lebar (`lg`), garis menghubungkan titik seragam dengan label manfaat; daftar manfaat tetap ada di bawah gambar. Pada layar lebih kecil, garis tidak ditampilkan dan manfaat dibaca melalui daftar tersebut. Bengkel mempertahankan hero lama dengan gambar memenuhi bidang; pada layar kecil, manfaat dipilih melalui tombol horizontal.

## Untuk admin

1. Masuk sebagai super admin atau product admin, lalu buka `/admin/site-content/industri`.
2. Pilih halaman inspirasi dari daftar industri. Industri dan alamat halaman bersifat tetap.
3. Ubah judul, pengantar, gambar, teks alternatif, fokus gambar, serta judul dan penjelasan tiap pin. Kolom eyebrow ditampilkan pada hero Bengkel; tata letak halaman baru tidak merendernya.
4. Gunakan “Ganti gambar” untuk JPG/JPEG, PNG, atau WebP, atau isi URL gambar. Unggahan memulai analisis posisi AI otomatis; “Deteksi ulang dengan AI” menjalankan ulang analisis.
5. Periksa hasilnya: geser titik jangkar ke bagian seragam dan label bernomor ke ruang yang sesuai. Analisis hanya memberi saran posisi/fokus berdasarkan judul manfaat, bukan jaminan penunjukan bagian atau kebenaran klaim produk.
6. Tambah, sembunyikan, atau hapus pin sesuai kebutuhan (data menyimpan 1–8 pin). Matikan “Tampilkan pin anotasi” bila label sudah menyatu dalam gambar; ini menyembunyikan anotasi dan daftar manfaat, bukan gambar atau halaman.
7. Tekan “Simpan perubahan”, tunggu pesan berhasil, lalu buka tautan halaman yang tersimpan untuk memeriksa hasil publik. Tautan tersebut bukan pratinjau draf.

Perubahan tetap berupa draf sampai section disimpan. Penyimpanan mencakup seluruh section Industri, termasuk draf halaman lain. “Kembalikan ke bawaan” mereset draf section, bukan hanya halaman terpilih; tindakan itu belum tersimpan sampai tombol simpan ditekan. Penyimpanan memerlukan tabel `site_content` yang siap, izin yang sesuai, dan isian valid.

Gambar bawaan adalah referensi kampanye yang saat ini dipakai bersama: apotek/klinik memakai visual klinik; beberapa usaha layanan memakai visual retail/restoran; kelompok lain memakai visual tim. Foto khusus tiap industri masih perlu disediakan/dipilih admin. Jangan menyimpulkan sertifikasi, kemampuan perlindungan, atau kesesuaian keselamatan dari foto maupun teks inspirasi; konfirmasikan spesifikasi produk dan kebutuhan tempat kerja secara terpisah.

## Untuk pengembang

- `src/features/site-content/industry-inspiration.routes.ts`: identitas kanonis 20 industri, slug, label, kelompok, dan tautan; slug tidak dikenal menghasilkan 404 melalui halaman dinamis.
- `industry-inspiration.content.ts` pada folder yang sama: teks/visual bawaan dan resolusi override. `industri.inspirationPages` menyimpan perubahan per industri; Bengkel tetap membaca `industri.inspiration` lama sampai override Bengkel disimpan secara eksplisit.
- `content.schema.ts`: validasi satu halaman per industri, kecocokan slug, batas teks, jumlah pin, dan koordinat 0–100 relatif terhadap gambar sumber. Tidak perlu membuat baris database baru per industri.
- `industry-inspiration.draft.ts`: penggabungan hasil asinkron memakai state terkini. Edit halaman lain, perubahan teks, pin manual, pin dihapus/diubah, dan gambar baru tidak boleh tertimpa hasil analisis lama. Pergantian halaman membatalkan permintaan editor yang ditinggalkan.
- `components/IndustryInspirationPagesEditor.tsx`, `IndustryInspirationEditor.tsx`, dan `SiteContentEditor.tsx` di folder fitur: pemilih halaman, unggahan/analisis, draf, serta simpan section melalui API admin yang ada.
- `src/app/inspirasi/` dan `src/components/industry-inspiration/`: direktori, halaman publik, pemetaan koordinat terhadap ukuran gambar, serta pilihan produk. `src/components/home/IndustryScaleShowcase.tsx` menghubungkan pintu masuk homepage.

## Verifikasi dan batasnya

Hasil rangkaian verifikasi implementasi: typecheck, lint pada berkas yang diubah, build produksi terpisah, dan uji regresi lulus; direktori memuat 20 tautan, seluruh 20 rute merespons HTTP 200, dan slug tidak dikenal merespons 404. Pemeriksaan browser desktop/mobile mencakup korporasi, klinik, retail, dan Bengkel; cakupan visual ini bukan pemeriksaan seluruh halaman pada seluruh perangkat.

Perintah pemeriksaan yang tersedia dari akar proyek:

```powershell
rtk npm run typecheck
rtk npm run lint
rtk npx tsx scripts/test-industry-inspiration.ts
rtk npm run test:site-content-model
rtk npm run check:homepage-industries
rtk python scripts/verify-industry-inspiration.py
```

Skrip browser membutuhkan server di `http://localhost:8000`, Python Playwright, dan Chrome. Skrip bersifat baca-saja terhadap aplikasi; ia menulis screenshot lokal ke `.impeccable/review/inspiration-2026-09-11`. Opsi `--quick` melewati putaran HTTP seluruh 20 rute sehingga tidak setara dengan pemeriksaan penuh. Opsi `--base=http://localhost:8017` memilih server lain.

Build akhir diverifikasi pada port 8017 sebelum server lokal port 8000 diperbarui. Server lokal aktif menggunakan output `.next-inspiration-verify` melalui `OFISSIO_BUILD_DIST_DIR`; build `.next` sebelumnya tetap disimpan. Untuk proses normal berikutnya tanpa override tersebut, jalankan `rtk npm run build` sebelum `rtk npm run start` agar `.next` juga memuat kode terbaru. Tidak ada deployment ke server publik atau push Git dalam tugas ini.

Penyimpanan admin melalui browser terautentikasi belum diverifikasi karena sesi meminta login. Tugas ini tidak melakukan penulisan database. Verifikasi berikutnya memerlukan sesi admin sah untuk mencoba unggah, analisis, simpan, muat ulang, dan konfirmasi pemisahan konten antarindustri.

Review independen memberi verdict **ship** setelah koreksi kehilangan draf asinkron ditangani; verdict itu terbatas pada temuan dan lingkup review tersebut, bukan audit menyeluruh atau bukti deployment publik. Koreksi review terakhir mempertahankan UI. Dokumentasi ini tidak menyatakan fitur sudah dipasang ke server publik atau hasil gambar memiliki ketepatan sempurna.
