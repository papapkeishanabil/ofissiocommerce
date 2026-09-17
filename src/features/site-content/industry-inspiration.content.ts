import type { Industry } from "@/types/industry";
import type { IndustriSectionData, IndustryInspirationData } from "./content.schema";
import { INSPIRATION_ROUTES, type InspirationPage } from "./industry-inspiration.routes";

type Benefit = readonly [title: string, description: string];
type PageCopy = { title: string; lede: string; benefits: readonly [Benefit, Benefit, Benefit] };

// Editorial direction, not unverified material, safety or certification claims.
const COPY: Record<Industry, PageCopy> = {
  Bengkel: {
    title: "Seragam yang Mengikuti Cara Tim Anda Bekerja.",
    lede: "Temukan inspirasi tampilan untuk aktivitas bengkel dan teknisi.",
    benefits: [["Tim mudah dikenali", "Bedakan tim layanan dan teknisi dengan identitas yang konsisten."], ["Siap untuk rutinitas aktif", "Pertimbangkan keleluasaan gerak saat memilih model."], ["Tampil profesional", "Bangun kesan rapi saat menyambut pelanggan."]],
  },
  Kesehatan: {
    title: "Kesan Tenang, Pelayanan yang Terpercaya.",
    lede: "Inspirasi seragam untuk tim apotek dan klinik: identitas yang mudah dikenali, tampilan rapi, dan model yang sesuai dengan aktivitas pelayanan.",
    benefits: [["Petugas mudah dikenali", "Seragam membantu pelanggan mengenali petugas yang siap membantu."], ["Rapi saat melayani", "Sesuaikan tampilan dengan nuansa apotek atau klinik Anda."], ["Sesuai aktivitas tim", "Pertimbangkan ruang gerak dan kebutuhan setiap peran sebelum menentukan model."]],
  },
  Retail: {
    title: "Tim Terlihat Rapi, Pelanggan Mudah Menemukan Bantuan.",
    lede: "Dari meja kasir hingga etalase, seragam yang rapi membantu pelanggan berbelanja dengan lebih percaya.",
    benefits: [["Staf mudah ditemukan", "Identitas yang seragam membedakan staf dari pengunjung toko."], ["Selaras dengan toko Anda", "Padukan pilihan warna dan logo dengan karakter merek."], ["Untuk berbagai peran", "Pilih model untuk kasir, pramuniaga, dan tim stok sesuai aktivitasnya."]],
  },
  "F&B": {
    title: "Tampilan Tim yang Menunjang Suasana Restoran.",
    lede: "Inspirasi seragam restoran dan kafe yang menyatukan karakter tempat Anda dengan tampilan tim pelayanan.",
    benefits: [["Pelayanan mudah dikenali", "Bantu tamu mengenali tim yang siap melayani."], ["Karakter tempat terasa", "Warna dan identitas seragam dapat mengikuti konsep restoran atau kafe."], ["Rapi di setiap peran", "Bedakan kebutuhan tim kasir, pelayanan, dan dapur saat memilih model."]],
  },
  Grosir: {
    title: "Satu Identitas, dari Area Penjualan hingga Distribusi.",
    lede: "Rancang tampilan tim grosir yang konsisten saat melayani pelanggan, menyiapkan barang, dan berkoordinasi antarbagian.",
    benefits: [["Tim mudah dikenali", "Identitas seragam membantu pelanggan menemukan petugas."], ["Selaras antarbagian", "Gunakan identitas yang sama untuk tim penjualan dan distribusi."], ["Pilihan sesuai peran", "Sesuaikan model untuk aktivitas di toko maupun area stok."]],
  },
  Laundry: {
    title: "Kesan Rapi Sejak Pelanggan Menyerahkan Cucian.",
    lede: "Seragam membantu menampilkan identitas laundry Anda, dari meja penerimaan hingga tim operasional.",
    benefits: [["Petugas mudah dikenali", "Bantu pelanggan mengenali tim penerimaan dan pengantaran."], ["Identitas lebih konsisten", "Selaraskan warna dan logo pada setiap bagian layanan."], ["Sesuai alur kerja", "Pertimbangkan aktivitas menyortir, menyetrika, dan melayani saat memilih model."]],
  },
  Salon: {
    title: "Tampilan Tim yang Sejalan dengan Karakter Salon Anda.",
    lede: "Inspirasi seragam untuk menyatukan penampilan tim salon dan kecantikan tanpa menghilangkan karakter layanan Anda.",
    benefits: [["Kesan profesional", "Bangun tampilan rapi saat menyambut dan melayani pelanggan."], ["Karakter merek terlihat", "Pilih warna dan penempatan logo yang sesuai dengan identitas salon."], ["Untuk layanan yang aktif", "Pertimbangkan keleluasaan gerak sesuai kebutuhan stylist dan terapis."]],
  },
  Bangunan: {
    title: "Identitas Tim yang Jelas, dari Toko hingga Pengantaran.",
    lede: "Inspirasi seragam toko bangunan untuk petugas penjualan, tim gudang, dan pengantaran dengan satu identitas usaha.",
    benefits: [["Staf mudah ditemukan", "Bantu pelanggan mengenali petugas di area toko."], ["Rapi saat bertemu pelanggan", "Pertahankan identitas toko hingga proses pengantaran."], ["Model sesuai tugas", "Bedakan kebutuhan tim penjualan dan penanganan barang."]],
  },
  Sparepart: {
    title: "Tampilan Profesional untuk Tim yang Paham Kebutuhan Pelanggan.",
    lede: "Seragam toko sparepart menyatukan penampilan tim di meja pelayanan, area stok, dan pengantaran.",
    benefits: [["Tim layanan dikenali", "Bantu pelanggan menemukan petugas yang tepat."], ["Identitas toko terbawa", "Selaraskan tampilan tim dengan merek toko Anda."], ["Sesuai rutinitas", "Pilih model berdasarkan aktivitas pelayanan dan pengelolaan stok."]],
  },
  Petshop: {
    title: "Tim yang Mudah Dikenali, Layanan yang Ramah.",
    lede: "Inspirasi tampilan tim petshop untuk menyambut pelanggan, membantu memilih produk, dan menjalankan layanan perawatan.",
    benefits: [["Petugas mudah ditemukan", "Identitas yang jelas membantu pelanggan meminta bantuan."], ["Selaras dengan usaha", "Warna dan logo menjadi bagian dari karakter petshop Anda."], ["Pilihan sesuai layanan", "Bedakan kebutuhan petugas toko dan tim grooming saat memilih model."]],
  },
  Ekspedisi: {
    title: "Satu Identitas di Setiap Titik Perjalanan Barang.",
    lede: "Inspirasi seragam untuk tim ekspedisi, dari layanan pelanggan dan penyortiran hingga pengantaran.",
    benefits: [["Petugas mudah dikenali", "Identitas seragam membantu saat berinteraksi dengan pengirim dan penerima."], ["Konsisten antarbagian", "Satukan tampilan tim cabang, gudang, dan pengantaran."], ["Sesuai aktivitas", "Pertimbangkan kebutuhan gerak dan lingkungan kerja saat memilih produk."]],
  },
  Security: {
    title: "Identitas Petugas yang Jelas di Area Kerja Anda.",
    lede: "Rencanakan kebutuhan seragam tim keamanan dengan memperhatikan identitas organisasi, tugas petugas, dan ketentuan yang berlaku.",
    benefits: [["Petugas mudah dikenali", "Tampilan yang konsisten membantu orang mengenali petugas."], ["Rapi saat bertugas", "Selaraskan kebutuhan identitas dan penampilan tim."], ["Sesuai ketentuan", "Konfirmasikan model dan atribut yang diperlukan sebelum pemesanan."]],
  },
  Corporate: {
    title: "Beragam Peran. Satu Identitas Perusahaan.",
    lede: "Dari tim kantor hingga operasional, bangun keselarasan seragam antar-divisi. Susun pilihan model, identitas, dan kebutuhan pengadaan dalam satu rencana.",
    benefits: [["Identitas perusahaan", "Selaraskan warna dan penempatan logo agar tampilan tim saling terhubung."], ["Model sesuai peran", "Tim kantor dan operasional dapat memakai model berbeda dengan identitas yang sama."], ["Konsisten antar-divisi", "Jadikan referensi seragam sebagai acuan saat merencanakan kebutuhan tiap bagian."]],
  },
  Pertambangan: {
    title: "Rencanakan Seragam untuk Setiap Peran di Operasi Anda.",
    lede: "Susun kebutuhan tim pertambangan, dari kantor hingga lapangan. Konfirmasikan persyaratan lokasi kerja dan kebutuhan perlindungan sebelum menentukan produk.",
    benefits: [["Identitas tim konsisten", "Hubungkan tampilan tim kantor dan operasional melalui identitas perusahaan."], ["Pilihan sesuai tugas", "Pertimbangkan aktivitas dan kondisi kerja setiap divisi."], ["Kebutuhan terpetakan", "Tetapkan persyaratan lapangan bersama tim pengadaan sebelum memesan."]],
  },
  Konstruksi: {
    title: "Identitas Tim yang Terhubung dari Kantor ke Proyek.",
    lede: "Rencanakan seragam tim konstruksi berdasarkan peran dan lingkungan kerja. Kebutuhan keselamatan proyek perlu dikonfirmasi terpisah dari pilihan tampilan.",
    benefits: [["Tim proyek dikenali", "Identitas yang konsisten membantu membedakan tim di area kerja."], ["Model sesuai peran", "Petakan kebutuhan staf kantor, pengawas, dan tim lapangan."], ["Selaras antarproyek", "Gunakan acuan warna dan logo yang sama untuk kebutuhan proyek berikutnya."]],
  },
  Manufaktur: {
    title: "Satu Identitas untuk Tim yang Menggerakkan Produksi.",
    lede: "Inspirasi seragam manufaktur untuk menyelaraskan penampilan tim administrasi, produksi, dan distribusi. Sesuaikan pilihan dengan aturan area kerja Anda.",
    benefits: [["Konsisten antarbagian", "Satukan identitas tim tanpa harus menyamakan semua model."], ["Sesuai tugas harian", "Pertimbangkan kebutuhan gerak dan ketentuan setiap area produksi."], ["Pengadaan terarah", "Susun kebutuhan model dan ukuran berdasarkan peran tim."]],
  },
  Perhotelan: {
    title: "Kesan Profesional di Setiap Pertemuan dengan Tamu.",
    lede: "Inspirasi seragam untuk menyelaraskan karakter hotel dengan tampilan tim front office, pelayanan, dan operasional.",
    benefits: [["Tim mudah dikenali", "Bantu tamu menemukan petugas di setiap bagian hotel."], ["Karakter hotel terlihat", "Warna dan gaya seragam dapat mengikuti identitas properti."], ["Selaras antarperan", "Pilih model sesuai tugas tanpa kehilangan kesatuan tampilan."]],
  },
  BUMN: {
    title: "Identitas Organisasi yang Konsisten di Setiap Unit.",
    lede: "Rencanakan kebutuhan seragam BUMN dan instansi dengan acuan identitas, peran tim, serta kelengkapan pengadaan yang diperlukan.",
    benefits: [["Identitas organisasi", "Selaraskan tampilan dengan pedoman warna dan logo instansi."], ["Sesuai fungsi unit", "Petakan kebutuhan tim pelayanan, administrasi, dan operasional."], ["Acuan bersama", "Gunakan referensi seragam yang sama saat berkoordinasi antarunit."]],
  },
  Maritim: {
    title: "Identitas yang Konsisten dari Kantor hingga Lapangan.",
    lede: "Inspirasi tampilan tim maritim, dari kantor hingga operasional. Tentukan kebutuhan lingkungan kerja dan perlindungan secara terpisah sebelum memilih produk.",
    benefits: [["Identitas tim terlihat", "Satukan tampilan perusahaan pada berbagai fungsi kerja."], ["Pilihan sesuai peran", "Bedakan kebutuhan staf kantor dan tim operasional."], ["Kebutuhan jelas di awal", "Konfirmasikan persyaratan kerja sebelum menyusun pengadaan."]],
  },
  Pendidikan: {
    title: "Identitas Bersama untuk Tim yang Mendukung Pendidikan.",
    lede: "Inspirasi seragam untuk pengajar, tenaga administrasi, dan tim pendukung dengan tampilan yang selaras dengan karakter institusi.",
    benefits: [["Tim mudah dikenali", "Bantu warga sekolah atau kampus mengenali tenaga layanan."], ["Karakter institusi", "Gunakan warna dan identitas yang selaras dengan lembaga."], ["Sesuai peran tim", "Pilih model untuk aktivitas pengajaran, administrasi, dan operasional."]],
  },
};

// These are existing campaign visuals, used as style references, not a claim
// that a particular pictured garment is certified for an industry's hazards.
function visualFor(industry: Industry) {
  if (industry === "Kesehatan") return {
    image: "/industries/campaign/apotek-klinik.png", imageAlt: "Inspirasi tampilan seragam tim apotek dan klinik",
    points: [[49, 25, 65, 20], [49, 47, 29, 43], [49, 61, 65, 61]],
  };
  if (["Retail", "F&B", "Grosir", "Laundry", "Salon", "Petshop"].includes(industry)) return {
    image: "/industries/campaign/retail-restoran.png", imageAlt: "Referensi tampilan polo untuk tim layanan pelanggan",
    points: [[47, 29, 64, 23], [44, 45, 26, 42], [48, 60, 64, 60]],
  };
  return {
    image: "/industries/ofissio-team-campaign-v2.png", imageAlt: "Referensi seragam kantor dan operasional dengan berbagai model untuk satu tim",
    points: [[36, 34, 18, 22], [57, 38, 78, 21], [72, 51, 84, 60]],
  };
}

export function defaultInspirationPage(industry: Industry): IndustryInspirationData {
  const route = INSPIRATION_ROUTES[industry];
  const copy = COPY[industry];
  const visual = visualFor(industry);
  return {
    enabled: true, industry, slug: route.slug, eyebrow: `Inspirasi ${route.label}`,
    title: copy.title, lede: copy.lede, image: visual.image, imageAlt: visual.imageAlt,
    focalX: 50, focalY: 50,
    annotations: copy.benefits.map(([title, description], index) => {
      const [anchorX = 50, anchorY = 50, labelX = 70, labelY = 45] = visual.points[index] ?? [];
      return { id: `manfaat-${index + 1}`, number: String(index + 1).padStart(2, "0"), title, description, anchorX, anchorY, labelX, labelY, hidden: false };
    }),
  };
}

export function resolveInspirationPage(
  page: InspirationPage,
  content: Pick<IndustriSectionData, "inspiration" | "inspirationPages">,
): IndustryInspirationData {
  const saved = content.inspirationPages?.find((item) => item.industry === page.industry && item.slug === page.slug);
  // Existing Bengkel edits remain the source until an explicit per-page override is saved.
  const data = saved ?? (page.industry === "Bengkel" ? content.inspiration : defaultInspirationPage(page.industry));
  return { ...data, industry: page.industry, slug: page.slug };
}
