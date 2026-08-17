export type GuideAudience = "Semua tim" | "Admin Ofissio" | "CS Ofissio" | "Operasional" | "Super Admin";

export interface AdminMenuGuide {
  href: string;
  title: string;
  group: "Mulai di sini" | "Master & pengaturan" | "Sales & customer" | "Pengerjaan & pengiriman" | "Sistem";
  audience: GuideAudience[];
  purpose: string;
  when: string;
  steps: string[];
  cautions?: string[];
  keywords: string[];
}

export interface WorkflowGuide {
  id: string;
  title: string;
  audience: GuideAudience[];
  summary: string;
  steps: Array<{ title: string; detail: string; href?: string }>;
  doneWhen: string;
}

export interface AdminDetailedProcedure {
  href: string;
  prerequisites: string[];
  procedure: Array<{ title: string; actions: string[]; expected: string }>;
  verification: string[];
  troubleshooting: string[];
  nextMenu?: { href: string; label: string; reason: string };
}

export const ADMIN_WORKFLOW_GUIDES: WorkflowGuide[] = [
  {
    id: "ready-stock",
    title: "Pesanan Ready Stock (STK)",
    audience: ["Admin Ofissio", "Operasional"],
    summary: "Untuk produk katalog tanpa custom. Admin memverifikasi pembayaran, lalu tim melakukan picking, packing, dan pengiriman.",
    steps: [
      { title: "Periksa pesanan baru", detail: "Buka Pesanan Customer, pastikan item, alamat, ongkir, kurir pilihan customer, dan pembayaran sesuai.", href: "/admin/orders" },
      { title: "Teruskan ke pengerjaan", detail: "Setelah pembayaran terverifikasi, tekan Teruskan ke Pengerjaan agar Perintah Kerja dibuat tanpa input ulang." },
      { title: "Picking dan packing", detail: "Tim operasional memperbarui tahap dan progress pada Perintah Kerja.", href: "/admin/process-orders" },
      { title: "Buat shipment", detail: "Gunakan kurir pilihan customer bila masih tersedia. Jika harus berubah, konfirmasi kepada customer sebelum booking.", href: "/admin/shipments" },
      { title: "Pantau sampai diterima", detail: "Resi dan event pengiriman harus terus terbarui agar customer dan Ofistant dapat menjawab status aktual.", href: "/admin/tracking" },
    ],
    doneWhen: "Status pesanan selesai, shipment delivered, dan tidak ada notifikasi yang belum ditangani.",
  },
  {
    id: "customization",
    title: "Ready Stock + Bordir/Custom Ringan (CUS)",
    audience: ["Admin Ofissio", "Operasional"],
    summary: "Produk katalog dengan bordir/sablon. Jadwal dan biaya dikonfirmasi dahulu sebelum customer menyetujui penawaran.",
    steps: [
      { title: "Tinjau permintaan", detail: "Periksa quantity, size matrix, semua posisi dan file logo pada Permintaan Customer.", href: "/admin/requests" },
      { title: "Konsultasi supervisor", detail: "Admin bertanya langsung kepada supervisor bordir mengenai tingkat kesulitan, titik, kapasitas, tanggal mulai, selesai, dan QC." },
      { title: "Tetapkan jadwal dan kurir", detail: "Tanggal serah ke kurir tidak boleh lebih awal dari estimasi selesai ditambah QC/packing. Pilih layanan yang benar-benar tersedia." },
      { title: "Kirim penawaran", detail: "Kirim jadwal, biaya bordir, estimasi tiba, dan quotation resmi kepada customer.", href: "/admin/quotations" },
      { title: "Proses setelah dibayar", detail: "Teruskan pesanan ke Perintah Kerja, jalankan bordir, QC, packing, shipment, lalu tracking.", href: "/admin/process-orders" },
    ],
    doneWhen: "Bordir lolos QC, seluruh logo sesuai posisi, barang diterima customer, dan order selesai.",
  },
  {
    id: "production",
    title: "Full Custom / Production (PRO)",
    audience: ["CS Ofissio", "Operasional"],
    summary: "Untuk desain, bahan, pola, ukuran, atau spesifikasi yang dibuat dari awal. CS menjadi PIC komunikasi sampai brief disetujui.",
    steps: [
    { title: "Terima dan ambil tiket konsultasi", detail: "Sistem mengirim notifikasi internal, email, dan push ke perangkat CS yang sudah diaktifkan. CS membuka tiket, menandai Saya Proses, lalu segera menghubungi customer melalui WhatsApp.", href: "/admin/notifications" },
      { title: "Lengkapi brief", detail: "Catat desain, fungsi pakaian, bahan, warna, size matrix, quantity, logo, target, budget, dan lampiran di Permintaan Customer.", href: "/admin/requests" },
      { title: "Validasi internal", detail: "Konfirmasi kelayakan teknis, sample, kapasitas, biaya, timeline produksi, QC, packing, dan logistik dengan tim terkait." },
      { title: "Kirim quotation dan skema DP", detail: "Customer harus melihat spesifikasi, milestone, jadwal, DP, pelunasan, serta ketentuan revisi sebelum menyetujui.", href: "/admin/quotations" },
      { title: "Buat dan perbarui Perintah Kerja", detail: "Setelah syarat pembayaran terpenuhi, jalankan approval sample, material, cutting, sewing, customization, QC, packing.", href: "/admin/process-orders" },
      { title: "Pelunasan dan pengiriman", detail: "Ikuti termin yang disetujui. Buat shipment saat barang siap dan tampilkan tracking aktual kepada customer.", href: "/admin/shipments" },
    ],
    doneWhen: "Seluruh milestone disetujui, pembayaran lunas, barang delivered, dan dokumen transaksi lengkap.",
  },
  {
    id: "daily-control",
    title: "Kontrol pekerjaan harian",
    audience: ["Semua tim"],
    summary: "Rutinitas agar permintaan, pembayaran, pekerjaan, atau pengiriman tidak terlewat.",
    steps: [
      { title: "Buka Dashboard", detail: "Mulai dari Attention queue, Needs review, pembayaran pending, deadline, dan tracking bermasalah.", href: "/admin" },
      { title: "Periksa notifikasi", detail: "Tandai Dibaca hanya berarti sudah melihat. Saya Proses berarti Anda mengambil tanggung jawab menindaklanjuti.", href: "/admin/notifications" },
      { title: "Kerjakan tindakan berikutnya", detail: "Urutkan daftar kerja berdasarkan tindakan berikutnya, umur pembaruan, deadline, dan penanggung jawab—bukan warna saja." },
      { title: "Tutup pekerjaan", detail: "Perbarui status dan catatan setelah tindakan nyata selesai agar tim lain dan customer menerima informasi yang sama." },
    ],
    doneWhen: "Tidak ada perhatian prioritas tanpa PIC, tindak lanjut, atau status aktual.",
  },
];

const g = (href: string, title: string, group: AdminMenuGuide["group"], audience: GuideAudience[], purpose: string, when: string, steps: string[], keywords: string[], cautions?: string[]): AdminMenuGuide => ({ href, title, group, audience, purpose, when, steps, keywords, cautions });

export const ADMIN_MENU_GUIDES: AdminMenuGuide[] = [
  g("/admin", "Dashboard", "Mulai di sini", ["Semua tim"], "Ringkasan kondisi operasional dan daftar yang perlu perhatian.", "Buka pertama kali saat mulai kerja dan ulangi sebelum selesai shift.", ["Baca Attention queue.", "Periksa permintaan, pembayaran, deadline, dan tracking bermasalah.", "Buka kartu terkait dan lakukan tindakan nyata."], ["ringkasan", "prioritas", "deadline"]),
  g("/admin/help", "Panduan", "Mulai di sini", ["Semua tim"], "Buku panduan operasional Ofissio yang dapat dicari berdasarkan tugas, menu, atau role.", "Saat belum tahu harus membuka menu mana atau bagaimana melanjutkan proses.", ["Cari nama pekerjaan atau masalah.", "Pilih alur kerja atau referensi menu.", "Ikuti langkah dan buka menu tujuan dari tautan yang tersedia."], ["help", "manual", "cara", "SOP"]),
  g("/admin/products", "Produk", "Master & pengaturan", ["Admin Ofissio", "Super Admin"], "Mengelola produk, SKU, gambar, varian, berat/dimensi aktual, status, dan model 3D.", "Saat menambah atau memperbaiki data produk yang dipakai katalog, ongkir, dan preview 3D.", ["Cari produk dengan nama/SKU atau gunakan filter.", "Lengkapi data komersial dan fisik produk.", "Unggah gambar/model GLB ke storage.", "Simpan lalu verifikasi tampilan customer dan cek ongkir."], ["SKU", "berat", "dimensi", "GLB", "gambar"], ["Berat dan dimensi harus aktual karena memengaruhi ongkir total quantity."]),
  g("/admin/pricing/embroidery", "Harga Bordir", "Master & pengaturan", ["Admin Ofissio", "Super Admin"], "Master tarif bordir per zona yang menjadi sumber harga sistem dan Ofistant.", "Saat harga per posisi, aturan quantity, atau layanan bordir berubah.", ["Periksa seluruh zona bordir.", "Isi harga dan status aktif.", "Simpan lalu uji harga dari halaman customer/Ofistant."], ["bordir", "zona", "harga", "logo"]),
  g("/admin/promotions", "Promo & Kupon", "Master & pengaturan", ["Admin Ofissio", "Super Admin"], "Membuat dan mengatur kode promo beserta syarat berlakunya.", "Saat menjalankan program diskon atau menonaktifkan promo.", ["Tetapkan kode, jenis/nilai diskon, periode, dan batas penggunaan.", "Aktifkan promo.", "Uji dari keranjang sampai ringkasan checkout."], ["diskon", "kupon", "promo"]),
  g("/admin/site-content", "Konten Homepage", "Master & pengaturan", ["Super Admin"], "Mengatur teks dan konten publik tanpa mengubah kode aplikasi.", "Saat konten pemasaran atau informasi homepage perlu diperbarui.", ["Pilih blok konten.", "Edit dengan bahasa final yang telah disetujui.", "Simpan dan periksa halaman publik."], ["homepage", "konten", "banner"]),
  g("/admin/ofistant-knowledge", "Knowledge Base Ofistant", "Master & pengaturan", ["Admin Ofissio", "Super Admin"], "Sumber pengetahuan terverifikasi agar Ofistant menjawab alami tanpa mengarang.", "Saat kebijakan, produk, harga, SOP, atau jawaban resmi berubah.", ["Cari topik yang akan diperbarui.", "Tulis fakta, batasan, dan tanggal berlaku.", "Publikasikan setelah review.", "Uji pertanyaan customer yang terkait."], ["AI", "Ofistant", "jawaban", "knowledge"], ["Jangan memasukkan asumsi atau data rahasia provider."]),
  g("/admin/settings/tax", "PPN", "Master & pengaturan", ["Super Admin"], "Menentukan tarif pajak yang dipakai perhitungan transaksi.", "Hanya saat kebijakan pajak resmi berubah.", ["Konfirmasi persetujuan finance/legal.", "Ubah tarif dan tanggal berlaku.", "Uji perhitungan keranjang, quotation, dan invoice."], ["PPN", "pajak"]),
  g("/admin/settings/shipping", "Kurir Checkout", "Master & pengaturan", ["Admin Ofissio", "Super Admin"], "Menentukan layanan provider pengiriman yang boleh ditawarkan saat checkout.", "Saat kurir/layanan diaktifkan, dinonaktifkan, atau provider berubah.", ["Aktifkan layanan di dashboard provider.", "Sinkronkan/aktifkan layanan yang diizinkan Ofissio.", "Uji cek ongkir dengan alamat dan paket nyata."], ["kurir", "ongkir", "Biteship", "provider"]),
  g("/admin/requests", "Permintaan Customer", "Sales & customer", ["Admin Ofissio", "CS Ofissio"], "Ruang discovery dan konsultasi sebelum menjadi penawaran resmi.", "Untuk permintaan jadwal bordir, Full Custom, Production, atau brief yang belum final.", ["Buka permintaan teratas/terlama.", "Ambil tanggung jawab dan hubungi customer bila perlu.", "Lengkapi kebutuhan, catatan konsultasi, jadwal, serta PIC.", "Teruskan menjadi quotation setelah spesifikasi siap."], ["REQ", "brief", "jadwal", "konsultasi"]),
  g("/admin/quotations", "Quotations", "Sales & customer", ["Admin Ofissio", "CS Ofissio"], "Daftar penawaran resmi yang sudah atau pernah dikirim kepada customer.", "Setelah kebutuhan, harga, jadwal, dan syarat komersial siap ditawarkan.", ["Periksa tindakan berikutnya dan status.", "Pastikan rincian serta jadwal final.", "Kirim quotation dan pantau diterima/revisi/ditolak.", "Konversi setelah customer menyetujui sesuai syarat."], ["quotation", "penawaran", "QUO"]),
  g("/admin/orders", "Pesanan Customer", "Sales & customer", ["Admin Ofissio"], "Meja kontrol komersial order: pembayaran, data customer, item, dan keputusan meneruskan ke pengerjaan.", "Saat order masuk, pembayaran berubah, atau sebelum membuat Perintah Kerja.", ["Periksa data order dan customer.", "Verifikasi pembayaran serta kurir pilihan customer.", "Tekan Teruskan ke Pengerjaan jika semua prasyarat terpenuhi.", "Pantau keterkaitan invoice, Perintah Kerja, dan shipment."], ["order", "pesanan", "pembayaran"], ["Menu ini bukan tempat memperbarui tahap produksi harian."]),
  g("/admin/invoices", "Invoices", "Sales & customer", ["Admin Ofissio"], "Memantau pembuatan, pengiriman, dan status invoice customer.", "Setelah order/termin pembayaran terbentuk atau invoice perlu dikirim ulang.", ["Cari order dan status invoice.", "Periksa nilai, customer, dan termin.", "Buat/kirim invoice.", "Pastikan status terkirim dan pembayaran direkonsiliasi."], ["invoice", "tagihan", "pelunasan", "DP"]),
  g("/admin/notifications", "Notifikasi", "Sales & customer", ["Semua tim"], "Kotak perhatian lintas proses yang memberi tahu pekerjaan baru atau perubahan penting.", "Periksa rutin sepanjang hari.", ["Buka notifikasi baru.", "Tandai Dibaca bila baru melihat.", "Pilih Saya Proses bila mengambil pekerjaan.", "Buka detail, lakukan tindak lanjut, lalu perbarui status."], ["notifikasi", "tiket", "saya proses"], ["Tandai Dibaca tidak berarti pekerjaan sudah selesai."]),
  g("/admin/settings/email", "Email", "Sistem", ["Super Admin"], "Konfigurasi dan pengujian email transaksi.", "Saat sender/provider berubah atau email gagal terkirim.", ["Periksa konfigurasi sender.", "Kirim email tes.", "Periksa log tanpa membocorkan credential."], ["SMTP", "email", "sender"]),
  g("/admin/process-orders", "Perintah Kerja", "Pengerjaan & pengiriman", ["Operasional", "Admin Ofissio", "CS Ofissio"], "Meja pelaksanaan setelah Pesanan Customer diteruskan: picking, bordir, produksi, QC, dan packing.", "Setelah prasyarat pembayaran/approval terpenuhi dan Perintah Kerja dibuat.", ["Ambil pekerjaan sesuai tim/PIC.", "Periksa route STK, CUS, atau PRO.", "Perbarui tahap, progress, catatan, bukti, dan deadline sesuai kondisi nyata.", "Serahkan ke shipment setelah siap dikirim."], ["work order", "pengerjaan", "produksi", "QC"]),
  g("/admin/shipments", "Shipments", "Pengerjaan & pengiriman", ["Operasional", "Admin Ofissio"], "Membuat booking pengiriman, menyimpan resi, dan memantau event carrier.", "Setelah barang selesai QC/packing dan siap diserahkan ke kurir.", ["Periksa alamat dan paket.", "Gunakan layanan pilihan customer atau konfirmasi perubahan.", "Buat shipment/booking.", "Pastikan resi serta status terus tersinkron sampai delivered."], ["shipment", "resi", "carrier", "pengiriman"]),
  g("/admin/customers", "Customers", "Sales & customer", ["Admin Ofissio", "CS Ofissio"], "Melihat profil company, PIC, alamat, riwayat permintaan, order, dan upload.", "Saat memvalidasi identitas, alamat, histori, atau konteks komunikasi customer.", ["Cari company/PIC.", "Periksa profil dan alamat.", "Gunakan riwayat sebagai konteks, bukan mengubah bukti transaksi lama."], ["company", "PIC", "alamat", "customer"]),
  g("/admin/catalog", "Catalog", "Master & pengaturan", ["Super Admin"], "Mengelola klasifikasi, pilihan, dan master data yang dipakai produk/katalog.", "Saat kategori, industri, warna, atau master katalog berubah.", ["Pilih master data.", "Hindari duplikasi nama/kode.", "Simpan dan periksa filter katalog customer."], ["kategori", "industri", "warna", "master"]),
  g("/admin/uploads", "Uploads / Logos", "Pengerjaan & pengiriman", ["Admin Ofissio", "CS Ofissio", "Operasional"], "Melihat file logo/referensi privat dan status validasinya.", "Saat meninjau artwork customer atau file gagal tampil/dipakai.", ["Cari file berdasarkan company/nama.", "Periksa tipe, ukuran, scan, dan preview.", "Gunakan signed URL; jangan membuat file privat menjadi publik."], ["logo", "artwork", "upload", "file"]),
  g("/admin/tracking", "Tracking", "Pengerjaan & pengiriman", ["Admin Ofissio", "Operasional"], "Memantau progress order dan pengiriman yang dilihat customer serta dibaca Ofistant.", "Saat customer menanyakan status, target terlambat, atau event tidak bergerak.", ["Cari nomor order.", "Bandingkan tahap, target, shipment, dan pembaruan terakhir.", "Tindak lanjuti pemilik proses bila terlambat.", "Sampaikan fakta dan langkah berikutnya; jangan membuat estimasi tanpa data."], ["tracking", "terlambat", "status", "Ofistant"]),
  g("/admin/integrations/ginee", "Ginee", "Sistem", ["Super Admin"], "Integrasi stok/order eksternal; bukan alur utama transaksi Ofissio.", "Saat sinkronisasi Ginee diaktifkan atau perlu diperiksa.", ["Periksa mode dan credential server.", "Jalankan sinkronisasi baca.", "Tinjau error sebelum mengaktifkan write."], ["Ginee", "sinkronisasi", "stok"]),
  g("/admin/audit", "Audit", "Sistem", ["Super Admin"], "Jejak tindakan keamanan dan perubahan penting untuk pemeriksaan.", "Saat investigasi akses, perubahan data, kegagalan provider, atau review kepatuhan.", ["Filter waktu, aktor, aksi, dan entitas.", "Cocokkan dengan kejadian operasional.", "Eskalasi anomali tanpa mengubah jejak audit."], ["audit", "log", "keamanan"]),
  g("/admin/users", "Tim Ofissio", "Sistem", ["Super Admin"], "Mengelola akun internal, role, status, dan batas akses.", "Saat onboarding, perubahan tugas, penonaktifan staf, atau audit akses.", ["Gunakan email kerja personal.", "Pilih role sesuai tanggung jawab minimum.", "Aktifkan akun dan uji menu yang boleh diakses.", "Nonaktifkan segera saat akses tidak lagi diperlukan."], ["user", "role", "CS", "superadmin", "akses"], ["Jangan berbagi akun admin dan jangan memberi Super Admin untuk pekerjaan operasional biasa."]),
];

const p = (
  href: string,
  prerequisites: string[],
  procedure: AdminDetailedProcedure["procedure"],
  verification: string[],
  troubleshooting: string[],
  nextMenu?: AdminDetailedProcedure["nextMenu"],
): AdminDetailedProcedure => ({ href, prerequisites, procedure, verification, troubleshooting, nextMenu });

/** SOP klik-per-klik. Harus tersedia untuk setiap href pada ADMIN_NAV_ITEMS. */
export const ADMIN_DETAILED_PROCEDURES: AdminDetailedProcedure[] = [
  p("/admin", ["Login dengan akun internal milik sendiri."], [
    { title: "Baca indikator utama", actions: ["Periksa Needs review, Active orders, Dalam pengerjaan, dan Need attention.", "Dahulukan angka merah, pembayaran baru, pekerjaan melewati target, dan pengiriman bermasalah."], expected: "Anda mengetahui jumlah pekerjaan yang membutuhkan tindakan hari ini." },
    { title: "Buka Attention queue", actions: ["Klik baris perhatian.", "Baca nomor dokumen, company, status, pembaruan terakhir, dan tindakan berikutnya."], expected: "Detail pekerjaan terbuka; jangan menyelesaikan pekerjaan hanya dari kartu ringkasan." },
    { title: "Kontrol akhir shift", actions: ["Pastikan pekerjaan baru memiliki PIC.", "Pastikan tindakan yang sudah dilakukan dicatat dan status diperbarui."], expected: "Tidak ada pekerjaan prioritas tanpa penanggung jawab atau pembaruan." },
  ], ["Angka dashboard sama dengan daftar pada menu tujuan.", "Tidak ada attention kritis yang dibiarkan tanpa PIC."], ["Jika angka tidak berubah, refresh halaman dan periksa apakah status detail sudah disimpan.", "Jika data gagal dimuat, periksa health/database dan laporkan nomor dokumen."], { href: "/admin/notifications", label: "Notifikasi", reason: "Periksa kejadian baru lintas proses." }),
  p("/admin/help", ["Ketahui pekerjaan atau masalah yang ingin diselesaikan."], [
    { title: "Cari panduan", actions: ["Ketik kata seperti produk, resi, DP, bordir, atau Full Custom.", "Pilih filter role bila hasil terlalu banyak."], expected: "Hanya alur dan menu yang relevan yang tampil." },
    { title: "Ikuti SOP", actions: ["Mulai dari Alur kerja end-to-end untuk memahami urutan.", "Buka Panduan setiap menu dan perluas menu yang akan digunakan."], expected: "Prasyarat, langkah, hasil, verifikasi, dan troubleshooting terlihat." },
  ], ["Tautan Buka menu mengarah ke halaman yang benar."], ["Gunakan kata yang lebih umum atau pilih Semua role jika hasil kosong." ]),
  p("/admin/products", ["Role memiliki izin katalog update.", "Kategori, industri, atribut/warna, harga, stok, foto, berat dan dimensi aktual sudah disiapkan.", "File GLB opsional sudah berformat .glb dan tidak melebihi batas upload."], [
    { title: "Cari sebelum membuat", actions: ["Buka Produk.", "Cari nama, SKU, ID, kategori, atau industri.", "Gunakan filter Status WooCommerce, Kesiapan Ofissio, dan Status model 3D."], expected: "Terlihat apakah produk sudah ada sehingga SKU ganda dapat dihindari." },
    { title: "Mulai produk baru", actions: ["Klik Tambah Produk Baru.", "Isi nama, slug, SKU unik, deskripsi, harga, status WooCommerce, kategori, industri, warna, dan data customization yang tersedia."], expected: "Data komersial dasar lengkap tanpa pesan validasi." },
    { title: "Lengkapi fisik dan media", actions: ["Isi berat per pcs dan dimensi panjang, lebar, tinggi aktual.", "Unggah foto produk.", "Unggah GLB pada bagian Model 3D bila tersedia."], expected: "Foto dapat dipreview; berat/dimensi bukan nol; status GLB siap bila diunggah." },
    { title: "Simpan ke WooCommerce", actions: ["Klik tombol simpan/buat produk sekali dan tunggu proses selesai.", "Ofissio membuat atau memperbarui produk WooCommerce sekaligus menyimpan metadata Ofissio; tidak perlu input ulang di dua tempat."], expected: "Halaman detail menampilkan WooCommerce Product ID dan tidak ada peringatan upload." },
    { title: "Periksa readiness", actions: ["Baca panel Product Readiness dan Yang Belum Lengkap.", "Lengkapi field penghambat lalu simpan kembali.", "Gunakan Lihat di WooCommerce hanya untuk memverifikasi data sumber."], expected: "Status berubah menjadi Valid/Tampil di Ofissio dan Published bila memang siap dijual." },
    { title: "Uji sinkronisasi end-to-end", actions: ["Kembali ke daftar Produk dan cari SKU.", "Buka katalog customer dan detail produk.", "Uji varian, foto, 3D, harga, quantity, lalu cek ongkir untuk memastikan berat total terbaca."], expected: "Data Ofissio, WooCommerce, katalog, keranjang, 3D, dan ongkir konsisten." },
  ], ["Woo Product ID muncul.", "SKU unik dan status Woo Published.", "Product Readiness tidak memiliki blocking issue.", "Foto tampil, GLB dapat dibuka, dan cek ongkir memakai berat quantity total."], ["Produk tidak tampil: cek Published dan panel readiness.", "Foto/GLB gagal: buka detail produk, lihat upload warning, periksa format/ukuran, lalu upload ulang.", "Stok/varian tidak sesuai: periksa Stock Matrix dan SKU setiap variasi.", "Ongkir salah: periksa berat/dimensi per pcs lalu simpan ulang."], { href: "/admin/catalog", label: "Catalog", reason: "Lengkapi master kategori/atribut bila pilihan belum tersedia." }),
  p("/admin/pricing/embroidery", ["Daftar zona bordir dan harga yang disetujui manajemen."], [
    { title: "Audit zona", actions: ["Buka setiap zona: dada kiri/kanan, lengan kiri/kanan, punggung atas/tengah atau zona aktif lain.", "Bandingkan harga sistem dengan master resmi."], expected: "Tidak ada zona transaksi yang kosong." },
    { title: "Perbarui tarif", actions: ["Isi harga per pcs dan aturan yang diminta form.", "Aktifkan hanya layanan yang benar-benar ditawarkan.", "Simpan perubahan."], expected: "Pesan sukses muncul dan nilai tetap sama setelah refresh." },
    { title: "Uji customer dan Ofistant", actions: ["Tambahkan produk dengan bordir pada satu lalu beberapa posisi.", "Ubah quantity dan pastikan total = tarif yang berlaku × quantity.", "Tanyakan harga bordir kepada Ofistant."], expected: "Keranjang dan Ofistant membaca master yang sama tanpa mengarang." },
  ], ["Seluruh zona wajib terisi.", "Perhitungan satu dan multi-posisi benar.", "Jawaban Ofistant menyebut data yang tersedia atau meminta detail yang kurang."], ["Harga tidak muncul: cek zona aktif dan simpan ulang.", "Harga berbeda: pastikan quantity dan posisi yang dibandingkan sama."], { href: "/admin/products", label: "Produk", reason: "Pastikan produk mengizinkan customization yang tepat." }),
  p("/admin/promotions", ["Kode, jenis diskon, nilai, periode, minimum transaksi, dan batas penggunaan sudah disetujui."], [
    { title: "Buat promo", actions: ["Klik tambah promo/kupon.", "Masukkan kode unik tanpa spasi, tipe dan nilai diskon, periode, minimum, serta limit.", "Aktifkan dan simpan."], expected: "Promo muncul di daftar dengan status aktif dan periode benar." },
    { title: "Uji sampai checkout", actions: ["Masukkan item yang memenuhi syarat ke keranjang.", "Terapkan kode.", "Lanjutkan checkout dan pilih ongkir."], expected: "Diskon tetap terbawa; PPN dan total akhir dihitung dari dasar yang benar." },
    { title: "Tutup program", actions: ["Nonaktifkan setelah program selesai.", "Jangan menghapus bukti promo dari transaksi lama."], expected: "Kode ditolak untuk transaksi baru tetapi histori tetap terbaca." },
  ], ["Nominal diskon konsisten di keranjang, checkout, quotation/order, dan invoice."], ["Kode ditolak: cek kapitalisasi, periode, minimum, status, dan limit.", "Promo hilang di checkout: catat kode serta cart dan laporkan sebagai defect sebelum transaksi." ]),
  p("/admin/site-content", ["Naskah dan aset sudah disetujui pemilik konten."], [
    { title: "Pilih section", actions: ["Buka Konten Homepage.", "Pilih bagian yang akan diubah dan baca konten saat ini."], expected: "Section yang benar terbuka, bukan section lain dengan judul serupa." },
    { title: "Edit dan simpan", actions: ["Ubah hanya field yang disetujui.", "Periksa ejaan, tautan, dan CTA.", "Simpan."], expected: "Pesan berhasil tampil dan perubahan bertahan setelah refresh." },
    { title: "Verifikasi publik", actions: ["Buka homepage pada desktop dan HP.", "Klik CTA/tautan yang diubah."], expected: "Konten tidak terpotong dan tujuan tautan benar." },
  ], ["Isi admin sama dengan homepage.", "CTA bisa digunakan."], ["Perubahan belum muncul: hard refresh dan cek section/status publikasi." ]),
  p("/admin/ofistant-knowledge", ["Fakta resmi, sumber internal, pemilik informasi, dan tanggal berlaku tersedia."], [
    { title: "Cari sebelum menambah", actions: ["Cari topik dan variasi pertanyaannya.", "Edit entri lama bila substansinya sama agar tidak kontradiktif."], expected: "Satu sumber kebenaran dipilih." },
    { title: "Tulis jawaban terverifikasi", actions: ["Isi judul/topik, fakta, batasan, dan kondisi eskalasi.", "Gunakan bahasa CS manusia; jangan memasukkan secret atau asumsi."], expected: "Jawaban jelas kapan Ofistant boleh menjawab dan kapan harus menyerahkan ke tim." },
    { title: "Publish dan uji", actions: ["Simpan/publish setelah review.", "Ajukan pertanyaan langsung, sinonim, dan pertanyaan yang datanya tidak tersedia."], expected: "Ofistant menjawab dari data; pada data kosong ia mengaku belum memiliki informasi." },
  ], ["Tidak ada entri saling bertentangan.", "Uji positif dan uji anti-halusinasi lulus."], ["Jawaban lama: periksa status publish dan cache/sesi chat baru.", "Jawaban salah: nonaktifkan entri konflik dan audit sumber." ]),
  p("/admin/settings/tax", ["Tarif dan tanggal berlaku telah disetujui finance/legal."], [
    { title: "Catat nilai lama", actions: ["Buka PPN dan catat tarif aktif serta waktu perubahan."], expected: "Ada dasar audit sebelum perubahan." },
    { title: "Ubah tarif", actions: ["Masukkan persentase resmi.", "Simpan dan refresh."], expected: "Tarif tersimpan persis sesuai persetujuan." },
    { title: "Uji dokumen", actions: ["Simulasikan keranjang, checkout, quotation, dan invoice.", "Cek dasar pengenaan setelah promo."], expected: "PPN dan total konsisten pada seluruh tahap." },
  ], ["Perhitungan manual sama dengan sistem."], ["Selisih pembulatan: bandingkan basis dan aturan pembulatan, jangan koreksi invoice manual." ]),
  p("/admin/settings/shipping", ["Provider shipping aktif, origin Ofissio lengkap, dan layanan sudah diaktifkan di provider."], [
    { title: "Sinkronkan pilihan", actions: ["Buka Kurir Checkout.", "Periksa provider aktif dan daftar layanan.", "Aktifkan layanan yang ingin ditawarkan Ofissio."], expected: "Layanan berstatus aktif di provider dan Ofissio." },
    { title: "Uji rate", actions: ["Gunakan produk dengan berat/dimensi valid dan alamat customer lengkap.", "Klik Cek Ongkir di checkout."], expected: "Provider mengembalikan layanan yang memenuhi rute, berat, dimensi, dan cakupan." },
    { title: "Analisis layanan hilang", actions: ["Pastikan dicentang di provider dan Ofissio.", "Periksa coverage origin-destination dan batas paket.", "Catat respons provider bila tetap kosong."], expected: "Diketahui apakah layanan tidak eligible atau ada masalah konfigurasi." },
  ], ["Layanan aktif yang eligible tampil di checkout.", "Harga berasal dari provider, bukan input manual."], ["Kurir tidak muncul tidak selalu error: bisa karena coverage atau batas paket.", "Rate gagal seluruhnya: cek alamat, koordinat/postal code, origin, credential, berat, dan dimensi." ]),
  p("/admin/requests", ["Permintaan customer/tiket sudah tercatat.", "PIC sesuai route: Admin untuk CUS, CS untuk PRO/Full Custom."], [
    { title: "Ambil permintaan", actions: ["Urutkan permintaan baru/terlama.", "Buka detail dan pilih Saya Proses bila Anda PIC.", "Baca customer, item, quantity, logo/lampiran, dan channel."], expected: "Permintaan memiliki penanggung jawab dan tidak diambil ganda." },
    { title: "Hubungi customer", actions: ["Untuk PRO, CS segera membuka WhatsApp customer dari workspace tiket.", "Catat waktu, ringkasan percakapan, kebutuhan belum jelas, dan janji tindak lanjut."], expected: "Customer benar-benar dihubungi; membuka tiket saja bukan tindak lanjut." },
    { title: "Lengkapi kebutuhan", actions: ["CUS: validasi logo, posisi, titik/kesulitan, quantity, jadwal supervisor, QC, kurir.", "PRO: lengkapi desain, bahan, pola, ukuran, fungsi, sample, budget, target, termin, dan approval."], expected: "Tidak ada parameter biaya/jadwal utama yang masih asumsi." },
    { title: "Siapkan penawaran", actions: ["Simpan catatan dan brief.", "Teruskan ke quotation hanya setelah biaya, spesifikasi, jadwal, dan syarat siap."], expected: "Dokumen berpindah dari REQ ke quotation resmi tanpa kehilangan konteks." },
  ], ["Nomor REQ sesuai CUS/PRO.", "PIC dan pembaruan terakhir terlihat.", "Riwayat komunikasi/brief lengkap."], ["Tombol tidak bereaksi: refresh, cek permission dan console.", "WhatsApp tidak tersedia: lengkapi nomor PIC customer dan gunakan kanal cadangan sambil mencatatnya."], { href: "/admin/quotations", label: "Quotations", reason: "Kirim penawaran resmi setelah discovery selesai." }),
  p("/admin/quotations", ["Brief/spesifikasi, harga, pajak, jadwal, ongkir/ketentuan kirim, dan termin sudah final secara internal."], [
    { title: "Pilih pekerjaan", actions: ["Gunakan tindakan berikutnya, status, umur pembaruan, dan PIC.", "Buka quotation yang perlu ditinjau/revisi/dikirim."], expected: "Prioritas dipilih berdasarkan pekerjaan, bukan hanya warna." },
    { title: "Review komersial", actions: ["Cocokkan item, quantity, unit price, custom, diskon, PPN, jadwal, expiry, DP/pelunasan, dan catatan.", "Pastikan route STK/CUS/PRO benar."], expected: "Total dan ketentuan tidak bertentangan dengan brief." },
    { title: "Kirim dan pantau", actions: ["Generate/periksa PDF.", "Kirim ke email customer.", "Pantau status sent/quoted, revisi, accept, reject, atau expired."], expected: "Email log dan dokumen penawaran tercatat." },
    { title: "Konversi", actions: ["Konversi hanya setelah acceptance dan prasyarat route terpenuhi.", "Untuk PRO, ikuti skema DP sebelum pengerjaan."], expected: "Pesanan terbentuk satu kali dan terhubung ke quotation asal." },
  ], ["Nomor quotation, PDF, email log, acceptance, dan order linkage tersedia."], ["Customer belum bisa Accept: pastikan penawaran final sudah dikirim.", "Nilai salah: revisi quotation; jangan mengubah bukti versi yang sudah diterima tanpa jejak."], { href: "/admin/orders", label: "Pesanan Customer", reason: "Verifikasi pembayaran dan teruskan order yang sudah sah." }),
  p("/admin/orders", ["Order sudah terbentuk dari checkout/quotation dan data payment provider tersedia."], [
    { title: "Pilih order yang perlu diproses", actions: ["Dahulukan pembayaran baru, order lunas belum diproses, lalu order tertua.", "Buka detail berdasarkan Tindakan berikutnya."], expected: "Order prioritas tidak terlewat." },
    { title: "Validasi snapshot", actions: ["Periksa company/PIC, alamat, item, size, logo per posisi, total, promo, pajak, ongkir, dan layanan pilihan customer."], expected: "Data yang akan diteruskan ke operasional lengkap dan konsisten." },
    { title: "Verifikasi pembayaran", actions: ["Cocokkan status dan event provider.", "STK/CUS biasanya menunggu lunas; PRO mengikuti DP/termin quotation."], expected: "Label pembayaran menunjukkan siap masuk proses sesuai route." },
    { title: "Teruskan ke Pengerjaan", actions: ["Klik Teruskan ke Pengerjaan satu kali.", "Tunggu konfirmasi dan tautan Perintah Kerja."], expected: "Perintah Kerja dibuat otomatis dari snapshot tanpa input ulang dan notifikasi operasional muncul." },
  ], ["Process route benar.", "Kurir pilihan customer tersimpan.", "Process Order ID/tautan muncul setelah diteruskan."], ["Tombol nonaktif: baca prasyarat pembayaran/approval.", "Alamat tidak lengkap: perbaiki melalui customer sebelum membuat shipment.", "Jangan klik berulang; cek Perintah Kerja untuk mencegah duplikasi."], { href: "/admin/process-orders", label: "Perintah Kerja", reason: "Laksanakan picking/custom/produksi setelah order diteruskan." }),
  p("/admin/invoices", ["Order dan termin pembayaran sudah benar."], [
    { title: "Cari invoice", actions: ["Cari nomor order/company dan filter status.", "Buka order sumber sebelum membuat dokumen bila ada keraguan."], expected: "Invoice terkait order yang benar dipilih." },
    { title: "Buat dan periksa", actions: ["Generate invoice.", "Periksa customer, alamat, nomor, item, subtotal, diskon, PPN, ongkir, total/termin."], expected: "PDF siap tanpa field kosong atau nilai berbeda." },
    { title: "Kirim dan rekonsiliasi", actions: ["Kirim ke email PIC.", "Periksa email log.", "Pantau payment event sampai paid/settlement."], expected: "Status ready/sent dan pembayaran tercatat." },
  ], ["PDF dapat dibuka.", "Email status terkirim.", "Nilai sama dengan order/payment."], ["Email gagal: cek alamat PIC dan konfigurasi Email, lalu kirim ulang setelah sebab diperbaiki.", "Invoice belum tersedia: pastikan order/termin sudah terbentuk." ]),
  p("/admin/notifications", ["Akun internal login dan izin sesuai jenis notifikasi."], [
    { title: "Aktifkan notifikasi perangkat", actions: ["Pada perangkat CS, buka Admin Ofissio melalui HTTPS atau localhost.", "Klik Aktifkan notifikasi di header dan pilih Allow/Izinkan pada browser.", "Pastikan label berubah menjadi Notifikasi aktif; aktivasi dilakukan satu kali per browser/perangkat."], expected: "Perangkat tercatat sebagai subscriber role CS dan dapat menerima push saat tab tidak sedang aktif." },
    { title: "Baca notifikasi", actions: ["Klik notifikasi untuk melihat jenis, nomor, customer, waktu, dan tindakan.", "Pilih Tandai Dibaca jika baru mengakui telah melihat."], expected: "Badge baru berkurang, tetapi pekerjaan belum dianggap selesai." },
    { title: "Ambil pekerjaan", actions: ["Klik Saya Proses bila Anda yang bertanggung jawab.", "Buka tombol Tinjau/Lihat untuk masuk ke detail."], expected: "PIC/acknowledgement tercatat dan detail yang tepat terbuka." },
    { title: "Lakukan follow-up", actions: ["Kerjakan tindakan di detail—misalnya hubungi customer, review pembayaran, atau proses order.", "Resolve/tutup hanya setelah tindakan selesai dan status sumber diperbarui."], expected: "Notifikasi tidak sekadar hilang; pekerjaan sumber benar-benar bergerak." },
  ], ["Badge, status notifikasi, PIC, dan status data sumber konsisten.", "Pada tiket Full Custom, status Email ke CS dan Push ke perangkat CS dapat dilihat."], ["Push belum masuk: pastikan VAPID siap, izin browser Allow, perangkat terdaftar, dan role akun adalah CS Full Custom.", "Tautan tidak membuka apa pun: catat ID notifikasi dan cek target href.", "Notifikasi ganda: proses tiket/order yang sama, jangan membuat entitas baru." ]),
  p("/admin/settings/email", ["Konfigurasi sender/provider dan alamat email uji tersedia."], [
    { title: "Periksa konfigurasi", actions: ["Pastikan sender name, from address, reply-to, dan mode sesuai environment.", "Jangan menampilkan atau menyalin secret ke layar/chat."], expected: "Konfigurasi dinyatakan siap tanpa secret terekspos." },
    { title: "Kirim tes", actions: ["Masukkan alamat penerima internal.", "Klik kirim tes dan tunggu status.", "Periksa inbox dan spam."], expected: "Email diterima dengan sender, subject, dan tautan yang benar." },
    { title: "Periksa transaksi", actions: ["Uji quotation/invoice/reset password sesuai kebutuhan.", "Cocokkan dengan email log."], expected: "Email transaksi juga berhasil, bukan hanya email tes." },
  ], ["Status send dan penerimaan inbox terbukti."], ["Gagal: cek provider, domain/sender verification, credential server, log, dan koneksi.", "Masuk spam: periksa SPF, DKIM, DMARC dan isi pesan." ]),
  p("/admin/process-orders", ["Pesanan Customer sudah diteruskan dan Perintah Kerja terbentuk.", "PIC/tim, material/stok, artwork, deadline, dan approval tersedia sesuai route."], [
    { title: "Pilih pekerjaan", actions: ["Dahulukan urgent, deadline terdekat, lalu pekerjaan tertua.", "Periksa route STK/CUS/PRO dan Tindakan berikutnya."], expected: "Tim membuka pekerjaan sesuai kewenangan dan prioritas." },
    { title: "Mulai tahap", actions: ["STK: picking lalu packing.", "CUS: persiapan artwork/bordir, QC, packing.", "PRO: approval, material, cutting, sewing, customization, finishing, QC, packing.", "Catat PIC dan waktu mulai."], expected: "Current stage dan progress mencerminkan pekerjaan nyata." },
    { title: "Perbarui bukti dan hambatan", actions: ["Simpan event setiap perpindahan tahap.", "Catat hasil QC, revisi, keterlambatan, dan target baru yang disetujui.", "Jangan menaikkan progress jika pekerjaan belum terjadi."], expected: "Customer/Ofistant mendapat status manusiawi berbasis data aktual." },
    { title: "Selesaikan pengerjaan", actions: ["Pastikan quantity dan QC final.", "Ubah ke siap dikirim/packing selesai.", "Teruskan ke shipment."], expected: "Barang siap dikirim dan data paket tersedia." },
  ], ["Tahap, progress, event, PIC, dan deadline konsisten.", "Tidak ada pekerjaan selesai tanpa QC/packing."], ["Perintah Kerja tidak muncul: cek apakah order sudah diteruskan.", "Progress tidak berubah: pastikan event tersimpan dan refresh.", "Deadline berisiko: eskalasi sebelum lewat target dan catat alasan faktual."], { href: "/admin/shipments", label: "Shipments", reason: "Booking dan pantau pengiriman setelah packing." }),
  p("/admin/shipments", ["Barang sudah QC dan packing.", "Alamat, nomor telepon, berat/dimensi paket, dan pilihan kurir customer tersedia."], [
    { title: "Buka order siap kirim", actions: ["Cari nomor order/shipment.", "Periksa alamat snapshot, paket, dan layanan yang dipilih customer."], expected: "Tidak ada field pengiriman wajib yang kosong." },
    { title: "Ambil rate dan pilih layanan", actions: ["Klik Cek Ongkir bila booking provider belum dibuat.", "Pilih layanan customer jika masih eligible.", "Jika berbeda, hubungi customer dan catat persetujuan."], expected: "Carrier, service, tarif, dan estimasi jelas." },
    { title: "Buat shipment", actions: ["Klik Buat shipment satu kali.", "Tunggu shipment number dan resi/provider ID.", "Cetak label bila tersedia."], expected: "Status bukan NOT_CREATED dan resi tersimpan." },
    { title: "Pantau event", actions: ["Refresh/sinkronkan status provider.", "Pantau pickup, transit, delivered, gagal, atau return.", "Tindak lanjuti exception."], expected: "Tracking customer dan Ofistant membaca event terbaru." },
  ], ["Shipment number, provider, service, resi, status, dan event tersedia."], ["Rate kosong: cek alamat, origin, paket, dan konfigurasi kurir.", "Booking gagal: jangan input resi palsu; catat error provider dan retry aman.", "Stuck transit: hubungi provider dan beri customer penjelasan berbasis event."], { href: "/admin/tracking", label: "Tracking", reason: "Pantau janji dan status yang dilihat customer." }),
  p("/admin/customers", ["Nama company, PIC, email, telepon/WhatsApp, dan konteks pencarian tersedia."], [
    { title: "Cari customer", actions: ["Cari company/PIC.", "Buka profil yang cocok dan verifikasi email/nomor agar tidak salah company."], expected: "Profil customer yang benar terbuka." },
    { title: "Periksa data", actions: ["Baca company profile, shipping/billing address, user, quotation, order, dan upload.", "Gunakan histori untuk konteks layanan."], expected: "Tim memahami siapa PIC dan transaksi terkait." },
    { title: "Tindak lanjuti sumber", actions: ["Buka quotation/order/upload dari relasinya.", "Perbarui profil melalui alur yang berwenang; jangan mengubah snapshot transaksi lama."], expected: "Data profil saat ini membaik tanpa merusak bukti historis." },
  ], ["Company ID, PIC, alamat, dan relasi dokumen sesuai."], ["Data ganda: jangan merge manual tanpa audit.", "Alamat order berbeda dapat merupakan snapshot saat transaksi; konfirmasi sebelum mengubah." ]),
  p("/admin/catalog", ["Daftar kategori, industri, atribut/term, kode, dan urutan sudah disetujui."], [
    { title: "Pilih master", actions: ["Buka Catalog lalu pilih Categories, Industries, atau Attributes.", "Cari nama/kode yang mirip sebelum menambah."], expected: "Duplikasi dapat dicegah." },
    { title: "Tambah/edit", actions: ["Isi nama konsisten, slug/kode unik, status, dan urutan jika tersedia.", "Simpan."], expected: "Master muncul setelah refresh." },
    { title: "Uji pemakaian", actions: ["Buka form Produk dan pastikan pilihan tersedia.", "Buka katalog customer dan periksa filter/count."], expected: "Master terhubung ke input admin dan filter publik." },
  ], ["Tidak ada nama/slug ganda.", "Pilihan muncul di form dan filter."], ["Tidak muncul di Produk: cek status aktif dan refresh data taxonomy.", "Menghapus master terpakai dapat merusak filter; nonaktifkan bila ragu."], { href: "/admin/products", label: "Produk", reason: "Terapkan master pada produk." }),
  p("/admin/uploads", ["Company/nama file atau nomor dokumen terkait diketahui."], [
    { title: "Cari file", actions: ["Filter company, tipe, nama, atau status.", "Cocokkan file dengan posisi/item yang tepat."], expected: "File customer yang benar ditemukan." },
    { title: "Validasi", actions: ["Periksa MIME, ekstensi, ukuran, scan, sanitize, dan status.", "Buka preview melalui signed URL."], expected: "File aman dan dapat dipreview tanpa menjadi publik." },
    { title: "Gunakan dalam proses", actions: ["Pastikan setiap posisi bordir merujuk file yang benar.", "Jika revisi, simpan file baru dan pertahankan jejak versi lama."], expected: "Admin, operasional, dan customer melihat artwork sesuai posisi." },
  ], ["Preview tampil dan status keamanan lulus.", "Logo per posisi tidak tertukar."], ["Thumbnail kosong: periksa signed URL expiry, bucket, file ID, dan akses company.", "File ditolak: minta format/ukuran yang didukung; jangan melewati validasi." ]),
  p("/admin/tracking", ["Nomor order/company tersedia dan status proses/shipment sudah diperbarui oleh pemiliknya."], [
    { title: "Cari order", actions: ["Cari nomor order atau company.", "Buka detail dan baca progress, tahap, target, next step, shipment, serta updated at."], expected: "Status aktual dan sumber pembaruan diketahui." },
    { title: "Jawab customer", actions: ["Sebut tahap yang benar-benar tercatat.", "Jika terlambat, akui keterlambatan, jelaskan penyebab yang tercatat, tindakan tim, dan waktu update berikutnya.", "Jangan menjanjikan tanggal tanpa konfirmasi."], expected: "Customer mendapat jawaban manusiawi dan faktual." },
    { title: "Eskalasi", actions: ["Jika tidak ada update, hubungi PIC Perintah Kerja atau shipment.", "Catat eskalasi dan perbarui next step setelah ada konfirmasi."], expected: "Tracking bergerak dan Ofistant membaca data terbaru." },
  ], ["Tahap, event, target, shipment, dan jawaban customer selaras."], ["Data stale: minta PIC sumber memperbarui, bukan mengarang status.", "Resi tidak bergerak: cek event provider dan eskalasi carrier." ]),
  p("/admin/integrations/ginee", ["Integrasi dikonfigurasi server-side dan mode test/write dipahami."], [
    { title: "Periksa health", actions: ["Buka Ginee dan periksa status koneksi.", "Pastikan fitur yang akan dipakai memang diaktifkan."], expected: "Koneksi dan mode terbaca tanpa membocorkan credential." },
    { title: "Sinkronisasi baca", actions: ["Jalankan check stock/inventory.", "Bandingkan sampel SKU dengan WooCommerce/Ofissio."], expected: "Data dapat dibaca dan mapping SKU diketahui." },
    { title: "Tangani selisih", actions: ["Catat SKU, nilai kedua sumber, waktu, dan error.", "Jangan mengaktifkan write otomatis sebelum hasil baca tervalidasi."], expected: "Tidak ada overwrite stok tanpa persetujuan." },
  ], ["Health sukses dan sampel SKU cocok."], ["SKU tidak ketemu: periksa mapping dan format SKU.", "Provider gagal: hentikan write dan gunakan sumber utama yang ditetapkan." ]),
  p("/admin/audit", ["Rentang waktu, aktor/company, aksi, atau entity yang dicari diketahui."], [
    { title: "Tentukan pertanyaan", actions: ["Nyatakan apa yang ingin dibuktikan: siapa, mengubah apa, kapan, dan pada dokumen mana."], expected: "Pencarian audit tidak terlalu luas." },
    { title: "Filter dan cocokkan", actions: ["Filter waktu, actor, action, entity type/ID.", "Cocokkan urutan event dengan dokumen dan log provider."], expected: "Kronologi dapat disusun dari bukti." },
    { title: "Eskalasi", actions: ["Simpan ID event dan ringkasan temuan.", "Laporkan anomali kepada Super Admin tanpa mengubah log."], expected: "Investigasi dapat ditinjau ulang." },
  ], ["Kesimpulan memiliki ID event/waktu/aktor pendukung."], ["Tidak ada event: perluas waktu atau cari entity ID lain; jangan menyimpulkan tanpa bukti." ]),
  p("/admin/users", ["Permintaan akses disetujui, email kerja personal aktif, role dan masa akses diketahui."], [
    { title: "Cari akun", actions: ["Cari email sebelum menambah.", "Pastikan akun tidak sudah ada/nonaktif."], expected: "Akun ganda dicegah." },
    { title: "Buat/ubah user", actions: ["Isi nama dan email kerja.", "Pilih role minimum: Admin menangani STK/CUS, CS menangani PRO/Full Custom, Operasional mengerjakan proses, Super Admin mengelola sistem.", "Aktifkan sesuai persetujuan."], expected: "User muncul dengan role dan status benar." },
    { title: "Uji akses", actions: ["Login sebagai role tersebut.", "Pastikan hanya menu/tindakan terkait tugas yang terlihat.", "Catat hasil onboarding."], expected: "Prinsip least privilege terpenuhi." },
    { title: "Offboarding", actions: ["Nonaktifkan segera ketika tugas/masa kerja selesai.", "Alihkan pekerjaan aktif ke PIC baru."], expected: "Akses berhenti tanpa meninggalkan pekerjaan yatim." },
  ], ["Email unik, role benar, menu terbatas, dan audit tercatat."], ["Undangan/login gagal: cek email, status akun, auth provider, dan reset password.", "Jangan menggunakan akun admin@ofissio.com bersama-sama." ]),
];
