# Product Completion

Produk baru boleh disimpan sebagai draft atau publish, tetapi publish tidak otomatis berarti tampil di Ofissio.

Readiness blocking:

- status WooCommerce publish;
- SKU, harga, kategori, dan industri;
- metadata GLB lengkap dan file GLB valid;
- MOQ dan lead time;
- fulfillment type dan transaction mode.

Setelah save, form menampilkan salah satu hasil:

- **valid untuk Ofissio**: produk dapat masuk katalog, pencarian, Ofistant, detail, dan cart;
- **tersimpan tetapi belum tampil**: produk tetap ada di WooCommerce/Admin dan pesan menyebutkan field blocking;
- **data tersimpan, GLB gagal**: data produk tidak hilang dan admin dapat mengulang upload GLB pada produk yang sama.

Warning foto tambahan, pricing tier, dan kelengkapan atribut tidak memblokir katalog pada Task A3.

Task A5 memvalidasi isi quantity pricing secara lebih rinci. Tier kosong, JSON invalid, overlap, harga per pcs tidak valid, dan ketidaksesuaian tier pertama dengan MOQ tetap berstatus **warning**, bukan blocking. Produk valid tetap tampil dan fallback ke `regular_price` bila tier tidak dapat diterapkan.

Task A4 menambahkan warning non-blocking untuk produk yang mendukung bordir tetapi belum memiliki pricing, tidak memiliki zona enabled, atau memiliki unit price/dimensi yang invalid. Warning menggunakan label **Harga bordir belum diatur**, **Harga bordir per zona tidak valid**, **Zona bordir belum dipilih**, atau **Harga per pcs bordir belum valid**. Produk tidak dikeluarkan dari katalog hanya karena warning pricing ini.
