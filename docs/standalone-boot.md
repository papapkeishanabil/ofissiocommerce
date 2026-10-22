# Layar pembuka Ofissio

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
