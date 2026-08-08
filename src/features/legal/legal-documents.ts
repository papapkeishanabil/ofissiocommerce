export interface LegalSection {
  title: string;
  paragraphs?: string[];
  items?: string[];
}

export interface LegalDocument {
  slug: string;
  title: string;
  summary: string;
  updatedAt: string;
  sections: LegalSection[];
}

const sharedContact =
  "Pertanyaan mengenai kebijakan ini dapat disampaikan melalui halo@ofissio.com. Permintaan akan diverifikasi sebelum data atau dokumen perusahaan diberikan.";

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    slug: "privacy-policy",
    title: "Kebijakan Privasi",
    summary:
      "Menjelaskan cara Ofissio mengelola data perusahaan, pengguna, transaksi, dan file artwork dalam layanan pengadaan seragam B2B.",
    updatedAt: "2026-08-08",
    sections: [
      {
        title: "Data yang kami proses",
        items: [
          "Identitas PIC dan perusahaan, termasuk nama, email, nomor telepon, alamat, dan informasi penagihan.",
          "Data quotation, order, invoice, pembayaran, pengiriman, serta riwayat komunikasi operasional.",
          "Logo, artwork, instruksi bordir, ukuran, dan spesifikasi produk yang diberikan untuk memenuhi pesanan.",
          "Data teknis terbatas seperti alamat IP, user agent, waktu akses, dan audit aktivitas untuk keamanan.",
        ],
      },
      {
        title: "Tujuan penggunaan",
        items: [
          "Memproses quotation, produksi/customization, pembayaran, pengiriman, dan dukungan pelanggan.",
          "Memastikan akses perusahaan terisolasi, mencegah penyalahgunaan, dan menyelesaikan sengketa operasional.",
          "Memenuhi kewajiban akuntansi, perpajakan, kontraktual, dan hukum yang berlaku.",
        ],
      },
      {
        title: "Penyimpanan dan pembagian",
        paragraphs: [
          "Data dapat diproses oleh penyedia infrastruktur, pembayaran, email, pengiriman, WordPress/WooCommerce, dan penyimpanan yang dibutuhkan untuk menjalankan layanan. Akses dibatasi sesuai fungsi operasional.",
          "File customer ditempatkan pada penyimpanan privat dan diakses melalui mekanisme server atau tautan sementara. Kami tidak menjual data perusahaan kepada pihak lain.",
        ],
      },
      {
        title: "Hak dan retensi",
        paragraphs: [
          "Perusahaan dapat meminta koreksi, salinan, pembatasan, atau penghapusan data, sejauh tidak bertentangan dengan kewajiban penyimpanan transaksi, audit, perpajakan, dan penyelesaian sengketa.",
          sharedContact,
        ],
      },
    ],
  },
  {
    slug: "terms-of-service",
    title: "Syarat Layanan",
    summary:
      "Ketentuan penggunaan Ofissio untuk quotation, pesanan produk standar, customization, dan produksi seragam khusus.",
    updatedAt: "2026-08-08",
    sections: [
      {
        title: "Ruang lingkup layanan",
        paragraphs: [
          "Ofissio menyediakan layanan B2B untuk pencarian produk seragam, konfigurasi logo, permintaan quotation, order, dokumen, pembayaran, pengiriman, dan pelacakan.",
          "Produk full custom dapat memerlukan brief, persetujuan desain, sampel, material, ukuran, dan jadwal produksi terpisah sebelum harga final diterbitkan.",
        ],
      },
      {
        title: "Quotation dan persetujuan",
        items: [
          "Estimasi awal bukan harga final sampai quotation berstatus final dan masih dalam masa berlaku.",
          "Persetujuan customer terhadap quotation mengikat spesifikasi, kuantitas, harga, pajak, dan ketentuan yang tercantum.",
          "Perubahan setelah persetujuan dapat memengaruhi harga dan lead time serta membutuhkan revisi quotation.",
        ],
      },
      {
        title: "Artwork, ukuran, dan produksi",
        paragraphs: [
          "Customer bertanggung jawab memastikan hak penggunaan logo/artwork dan keakuratan data ukuran. Warna pada layar, foto, render 3D, dan hasil bahan fisik dapat memiliki variasi yang wajar.",
          "Lead time dihitung setelah prasyarat operasional terpenuhi, termasuk persetujuan desain, pembayaran yang dipersyaratkan, dan ketersediaan material.",
        ],
      },
      {
        title: "Akun dan penggunaan yang aman",
        paragraphs: [
          "Pengguna wajib menjaga kredensial, hanya mengakses data perusahaan yang berwenang, dan tidak mencoba mengganggu, menyalin secara tidak sah, atau mengeksploitasi layanan.",
          sharedContact,
        ],
      },
    ],
  },
  {
    slug: "refund-policy",
    title: "Kebijakan Pembatalan & Refund",
    summary:
      "Panduan pembatalan, revisi, pengembalian dana, dan pengecualian untuk produk custom atau yang sudah diproses.",
    updatedAt: "2026-08-08",
    sections: [
      {
        title: "Sebelum proses dimulai",
        paragraphs: [
          "Permintaan pembatalan harus disampaikan tertulis. Jika pembayaran sudah diterima tetapi produksi, customization, atau pembelian material belum dimulai, refund dapat diproses setelah dikurangi biaya nyata yang telah timbul.",
        ],
      },
      {
        title: "Produk custom dan pesanan berjalan",
        items: [
          "Produk dengan logo, bordir, sablon, nama, ukuran khusus, bahan khusus, atau desain khusus umumnya tidak dapat dibatalkan setelah pengerjaan dimulai.",
          "Deposit atau biaya desain/material yang sudah digunakan dapat bersifat tidak dapat dikembalikan.",
          "Perubahan scope setelah approval diperlakukan sebagai revisi dan dapat menimbulkan biaya serta lead time baru.",
        ],
      },
      {
        title: "Ketidaksesuaian atau cacat",
        paragraphs: [
          "Customer wajib melaporkan ketidaksesuaian jumlah, spesifikasi, atau cacat yang dapat diverifikasi maksimal 7 hari kalender setelah barang diterima, disertai foto/video dan nomor order.",
          "Setelah verifikasi, penyelesaian dapat berupa perbaikan, penggantian, kredit, atau refund proporsional sesuai kondisi dan kesepakatan tertulis.",
        ],
      },
      {
        title: "Proses refund",
        paragraphs: [
          "Refund yang disetujui dikirim ke metode/rekening yang terverifikasi. Waktu penyelesaian bergantung pada bank atau penyedia pembayaran.",
          sharedContact,
        ],
      },
    ],
  },
  {
    slug: "shipping-policy",
    title: "Kebijakan Pengiriman",
    summary:
      "Ketentuan alamat, biaya, estimasi, serah terima, pelacakan, dan penanganan kendala pengiriman pesanan B2B.",
    updatedAt: "2026-08-08",
    sections: [
      {
        title: "Alamat dan tarif",
        paragraphs: [
          "Customer wajib memastikan nama penerima, nomor telepon, alamat, kode pos, dan akses lokasi benar sebelum shipment dibuat. Biaya pengiriman dapat berupa estimasi dan dikonfirmasi pada quotation atau invoice.",
        ],
      },
      {
        title: "Estimasi dan pelacakan",
        items: [
          "Estimasi pengiriman dimulai setelah barang selesai QC dan diserahkan kepada kurir.",
          "Nomor resi dan status yang tersedia di Ofissio berasal dari data kurir/provider atau input operasional terverifikasi.",
          "Keterlambatan karena kurir, cuaca, area terbatas, hari libur, atau force majeure dapat berada di luar kendali Ofissio.",
        ],
      },
      {
        title: "Penerimaan dan kendala",
        paragraphs: [
          "Penerima diminta memeriksa kondisi paket dan mendokumentasikan kerusakan sebelum atau saat membuka paket. Kehilangan atau kerusakan dalam pengiriman akan ditangani bersama kurir sesuai bukti dan ketentuan klaim.",
          "Pengiriman ulang akibat alamat atau kontak yang salah dapat dikenakan biaya tambahan.",
          sharedContact,
        ],
      },
    ],
  },
];

export function getLegalDocument(slug: string) {
  return LEGAL_DOCUMENTS.find((document) => document.slug === slug);
}
