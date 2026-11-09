# Layout edit produk admin

Aktif di produksi pada 8 November 2026, rilis `20261108-product-editor-layout-v1`, dengan baseline `20261108-home-format-restored-v2`.

Halaman `/admin/products/woocommerce/[id]` membuka tab **Informasi produk** secara default. Form yang sudah ada tetap dipakai. Tabel stok yang sebelumnya mendahului form dipindahkan ke tab **Stok SKU**, dengan jumlah SKU pada label. Editor pemetaan varian berada di tab **Pemetaan SKU**, tetap mengikuti izin `admin:catalog:update`. Tab stok hanya tersedia jika pengguna memiliki izin melihat monitoring stok.

Semua panel tetap terpasang saat tab diganti sehingga isian dan state editor tidak hilang. Perpindahan tab tidak melakukan penyimpanan; tombol simpan masing-masing form tetap berlaku. Workspace diberi key ID produk agar membuka produk lain kembali dimulai dari informasi produk. Navigasi tab mendukung klik, Tab, panah kiri/kanan, Home, dan End dengan atribut tablist/tab/tabpanel.

Tabel stok menampilkan maksimal 10 SKU per halaman pada desktop maupun mobile, dengan pencarian SKU/ukuran dan filter Aman, Menipis, Perlu produksi, serta Tidak tersinkron. Pergantian pencarian/filter mengembalikan halaman ke awal. Kondisi hasil kosong dan batas tombol pagination ditangani. Seluruh data tetap berasal dari matrix WooCommerce yang sudah ada; tindakan replenishment dan hak akses tidak diubah. Komponen panel stok kini merupakan client component untuk interaksi filter dan pagination.

Validasi lokal: TypeScript, ESLint file terkait, dan `scripts/webtest-product-editor-layout.py`. Pengujian browser menggunakan komponen workspace dan panel stok aktual dengan matrix 35 SKU sintetis: tampilan awal form, pagination, pencarian/status, hasil kosong, state form lintas-tab, keyboard, desktop 1440 dan mobile 390 tanpa overflow. Fixture tidak menguji penyimpanan WooCommerce, route admin terautentikasi, atau proses replenishment. Tidak ada request tulis API dalam pengujian.

Fixture dibangun melalui `node .artifacts/product-editor-layout/build.cjs`; screenshot, HTML interaktif, dan hasil berada di `.artifacts/product-editor-layout/`. Form informasi pada fixture adalah form contoh untuk menguji state wrapper; route produk aktual tetap memakai AdminProductForm lengkap.

## Verifikasi produksi

Patch tiga file runtime dan dokumentasi mempertahankan 1.326 file baseline lainnya. Typegen, TypeScript, lint terkait, prebuild dan build produksi lulus. Browser terautentikasi pada kandidat dan domain publik memeriksa produk WooCommerce #1776 pada desktop 1440 dan mobile 390: tab informasi default, editor asli, batas 10 SKU, pagination, pencarian, filter status, hasil kosong, pemetaan SKU, isian nama yang belum disimpan tetap ada, keyboard, dan tanpa overflow/error runtime. Timestamp pemeriksaan stok memakai Asia/Jakarta secara eksplisit agar render server/browser konsisten dan tidak memicu hydration mismatch. Pengujian menolak request tulis API; tidak ada penyimpanan produk, perubahan stok, atau perubahan status pesan. Popup chat ditutup secara lokal melalui tombol biasa saat menutupi kontrol.

Tidak ada migrasi database atau perubahan konfigurasi produksi. Sesi QA sementara dicabut setelah pengujian. Deployment memakai patch terisolasi, tanpa commit/push workspace yang memuat pekerjaan lain. Bukti lokal berada di `.artifacts/product-editor-deploy-20261108/deployment-result.json`, `production-browser.json`, dan screenshot. Log server: `/var/www/ofissio.com/deployments/20261108-product-editor-layout-v1/`. Rollback ke `/var/www/ofissio.com/releases/20261108-home-format-restored-v2` melalui symlink current dan restart service.
