# Layar pembuka Ofissio

## Perilaku terbaru saat koneksi lambat

Status aktivasi dicatat pada `RELEASE.json` di rilis server; dokumen ini
mencatat desain dan pemeriksaannya, bukan bukti bahwa deployment sudah aktif.

Animasi referensi (simbol, kilau berulang, ring cahaya, wordmark) tetap tampil
selama dokumen awal belum selesai diterima atau shell aplikasi belum
terhidrasi. Kesiapan kini memakai dua sinyal: `DOMContentLoaded` dan commit
`RouteAwareShell` melalui modul `boot-readiness.ts`. Tidak memakai `window.load`
dan tidak menunggu seluruh gambar, video, model 3D atau request nonkritis.
Setelah siap, overlay keluar dalam 180ms; tidak ada minimum waktu tunggu baru.

Saat koneksi lambat, kilau dan ring mengulang siklus 1,6 detik. CSS memberi batas
30 detik agar kegagalan hydration tidak menutup error aplikasi selamanya.
Sesudah batas itu, lapisan dekoratif menghilang, memperlihatkan halaman/error
yang tersedia dan panel pemulihan dengan tautan biasa `Coba lagi`. Tautan ini
tetap berfungsi tanpa hydration dan mempertahankan path serta query tujuan.
Jika kesiapan terlambat tercapai, panel pemulihan ikut ditutup otomatis.
Reduced motion tetap statis. Navigasi internal dan resume tidak mengulang boot.

Pengujian lokal menahan chunk aplikasi selama lebih dari 6 detik dan membuktikan
logo masih terlihat serta animasinya masih berulang. Setelah chunk dilepas,
overlay tertutup. Skenario tanpa hydration selama 30 detik memunculkan panel
pemulihan; klik Coba lagi berhasil memuat ulang URL semula. Typecheck, lint
terkait, dan pemeriksaan browser lulus tanpa pageerror/console error normal.
Artefak: `artifacts/boot-loading-aware-local/`.

PWA hanya bisa menjalankan animasi ini setelah HTML dan CSS awal tersedia.
Kegagalan sebelum dokumen diterima tetap ditangani splash native/browser.
Bagian berikut merupakan riwayat perubahan sebelumnya.

## Referensi gerakan terbaru — perubahan lokal

Referensi terbaru pengguna adalah
`artifacts/standalone-boot/video/page@b75063f084581a0802846995ad6d0ca8.webm`
(3,08 detik). Video ini merekam konsep HTML awal: kemunculan lembut, kilau,
ring cahaya dan wordmark yang muncul bertahap. Versi lokal terbaru mengikuti
gerakan itu dalam urutan sekitar 1,1 detik, tanpa bar loading atau slogan.
Simbol tetap memakai aset asli dan tidak berputar. Wordmark ditempatkan di
bawah simbol tanpa menggeser titik tengah simbol dari splash native.

Kebijakan durasi masih mengikuti kesiapan shell (belum menambahkan waktu
tunggu minimum); pilihan pengguna tentang menuntaskan animasi sekitar 1 detik
masih ditanyakan. Perubahan terbaru ini belum dipasang ke produksi.
Pengujian browser lokal dan typecheck lulus. Preview visual aktual aplikasi
tersimpan di `artifacts/boot-reference-style-local/reference-motion-preview.webm`;
hydration sengaja diblokir hanya pada rekaman visual itu agar seluruh gerakan
dapat terlihat. Ini tidak menambahkan penundaan di kode aplikasi.

## Penyederhanaan berdasarkan video Android 22 Oktober 2026

Video pengguna berdurasi 5,66 detik memperlihatkan ikon splash Android pada
sekitar detik 2, kemudian splash web dengan simbol lebih kecil, wordmark,
orbit dan bar loading pada sekitar detik 3. Perubahan terbaru menghapus
wordmark, orbit dan bar loading dari komponen boot. Hanya satu simbol tersisa,
menggunakan PNG yang sama dengan ikon Android, di tengah bidang 192 CSS px
(simbol sekitar 142px), dengan kilau 700ms tanpa memutar atau mengubah bentuk
logo. Warna dan skala kini lebih dekat ke splash native pada video. Ukuran
native yang tepat tetap ditentukan Android/browser dan dapat berbeda antar HP.

Kesiapan shell, exit singkat, larangan replay pada navigasi, reduced motion,
serta batas keselamatan 6 detik dipertahankan. Tidak ditambahkan minimum waktu
tunggu. Tahap native masih milik OS; PWA tidak dapat mengganti animasinya
melalui manifest. Bagian di bawah mencatat implementasi dan verifikasi awal
sebelum penyederhanaan ini.

Implementasi lokal, belum dideploy. Referensi visual: `Ofissio-Boot-Preview.html`
dan `E:/PROJECT AI/Video/Ofissio-Boot-Preview/CATATAN-PENERAPAN.txt`.

## Temuan yang terbukti

- Sebelum perubahan, root metadata hanya menautkan favicon PNG 32px dan SVG.
  SVG tersebut membungkus PNG 128px, bukan logo vektor.
- Tidak ditemukan manifest instalasi, wrapper native/Capacitor, atau komponen
  splash di kode proyek. Jenis instalasi Android pengguna belum diverifikasi.
  Rekaman layar saja tidak membuktikan asal ikon splash native.
- `public/ofissio-push-sw.js` hanya menangani push/notificationclick. Registrasi
  dilakukan AdminPushToggle. Tidak ada fetch handler atau cache aset/offline;
  file dan mekanisme pembaruannya tidak diubah.
- Master lokal `public/brand/ofissio.png` adalah raster RGBA 2172×724.
  Simbol dipotong pada area 480×475, wordmark 1590×305, mengikuti logo asli.
  Pada tampilan simbol 112 CSS px, sumber cukup untuk layar 3×. Ini bukan
  master vektor; detail di atas resolusi tersebut tetap dibatasi raster.
  Simbol dalam ikon PNG 512 hanya sekitar 379px, tidak diperbesar dari favicon.

## Implementasi

- `src/app/manifest.ts`: manifest `/manifest.webmanifest`, id/scope/start_url `/`,
  display standalone, theme/background `#091629`, ikon any 192/512 dan maskable
  512 terpisah. Bentuk maskable seluruhnya berada di safe circle radius 40%.
- `src/app/layout.tsx`: manifest, apple icon, theme color, root boot component.
- `src/components/shell/StandaloneBoot.tsx` dan `.module.css`: markup SSR dengan
  CSS display-mode gate, logo chrome, kilau sekali, orbit sekali, indikator kecil.
  Browser biasa tidak menampilkan splash. Tidak mengubah lokasi/deep link.
- Effect root menandai kesiapan shell setelah commit hydration dan dua frame;
  exit 180ms, tanpa minimum durasi. Tidak menunggu data/gambar/media nonkritis.
  Komponen root persisten sehingga navigasi client, render ulang, dan kembali
  dari background tidak mengulang animasi. BFCache langsung menyembunyikannya.
  Reload dokumen standalone memulai boot baru; resume dokumen yang sama tidak.
- Kegagalan hydration/JS: CSS menutup overlay paling lambat sekitar 6 detik,
  memperlihatkan halaman/error yang tersedia. Tidak menyediakan offline cache
  baru; kegagalan sebelum HTML tersedia tetap ditangani browser/OS.
- Overlay inert, aria-hidden, tanpa pengambilan fokus. Reduced motion statis
  dengan exit minimal. Timer, frame callback, listener dibersihkan.
- Aset lokal bernama versi menggunakan cache HTTP browser biasa. Tidak
  menambah service worker atau mengganti strategi notifikasi.
- `scripts/generate-boot-icons.py`: generator aset, memerlukan Pillow hanya
  saat regenerasi. Tidak ada dependensi runtime tambahan.

## Preview dan verifikasi

`npm run dev` menyediakan http://localhost:8000. Tab browser biasa sengaja tidak
menampilkan boot. `python scripts/verify-standalone-boot.py` menjalankan Chromium
headless dengan simulasi mode standalone melalui penggantian kondisi media CSS
(Chromium ini tidak mendukung emulasi display-mode lewat CDP). Semua aturan
animasi dan komponen tetap berasal dari aplikasi sebenarnya.

Screenshot dan hasil: `artifacts/standalone-boot/`. Termasuk mobile 360px/3×,
layar kecil 280px, desktop, reduced motion, shell siap dan hydration gagal.
Pemeriksaan mencakup manifest/ikon HTTP, URL utuh, navigasi internal tanpa replay,
resume, reduced motion, timeout keselamatan. Tidak ada pageerror pada alur normal.
Tidak ada pengujian Android fisik atau validasi WebAPK pada tahap ini.

Hasil akhir 22 Oktober 2026: `npm run typecheck`, ESLint untuk tiga file TS/TSX
yang diubah, pemeriksaan mekanis UI, dan `npm run build` lulus. Build pertama
terkendala akses Google Fonts; build dengan jaringan kemudian berhasil setelah
cache tipe development yang rusak dipulihkan. Sumber konfigurasi/bisnis tidak
diubah untuk melewati pemeriksaan. Peringatan deprecation middleware Next.js
yang sudah ada tetap muncul.

Verifikasi lanjutan juga lulus terhadap server **build produksi lokal** pada
`http://127.0.0.1:8002`, dengan perintah:

```sh
python scripts/verify-standalone-boot.py http://127.0.0.1:8002 standalone-boot-production
```

Hasil disimpan di `artifacts/standalone-boot-production/results.json`, screenshot
di folder yang sama, dan rekaman `boot-verification.webm`. Pengujian benar-benar
mengklik tautan Next.js `/forgot-password`, memeriksa identitas DOM root yang
tetap sama, serta memeriksa console sebelum skenario kegagalan JS disengaja.
Tidak ada pageerror atau console error pada alur normal. Rekaman mencakup
seluruh skenario verifikasi; penundaan hydration 1,6 detik dipasang oleh pengujian
agar animasi dapat terlihat. Penundaan tersebut tidak ada di aplikasi.
Server port 8001 di sandbox tidak merespons; pengujian berhasil melalui server
localhost port 8002. Tidak ada deployment atau perubahan instalasi Android.

## Menguji ikon Android setelah deployment yang disetujui

1. Pada origin HTTPS yang sudah memuat perubahan, periksa manifest dengan
   DevTools Application dan pastikan ketiga ikon baru berhasil dimuat.
2. Untuk instalasi lama, buka aplikasi saat online, tutup, lalu buka kembali.
   Pembaruan metadata/ikon WebAPK dikelola Chrome/Android dan dapat tertunda;
   pembaruan service worker bukan jaminan pembaruan ikon launcher.
3. Bandingkan dengan instalasi baru. Jika ikon lama menetap, hapus instalasi
   shortcut/aplikasi lalu instal kembali dari origin yang sama. Pastikan URL
   yang benar karena tipe instalasi lama belum diketahui.
4. Uji cold/warm launch, deep link/notifikasi, pindah tab, jaringan lambat,
   offline, reduced motion, mask ikon lingkaran/squircle dan ukuran layar kecil.
   Native splash statis mengikuti OS; animasi baru berjalan setelah HTML dirender.
5. Localhost di komputer belum memperbarui instalasi produksi di HP. Untuk uji
   lokal Android gunakan koneksi localhost melalui adb reverse atau preview HTTPS
   yang disetujui; LAN HTTP biasa bukan origin instalasi PWA yang aman.
