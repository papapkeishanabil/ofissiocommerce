import type { OfissioProduct } from "@/features/products/product.types";
import type { Industry } from "@/types/industry";
import { isSleeveOption } from "@/features/products/product-variants";

type RoleChoice = { slug: string; role: string; gender?: OfissioProduct["gender"] };

const ROLE_CHOICES: Partial<Record<Industry, RoleChoice[]>> = {
  Kesehatan: [
    { slug: "kemeja-kerja-casual-km", role: "Pelayanan & administrasi pria", gender: "men" },
    { slug: "frm", role: "Pilihan lain untuk administrasi pria", gender: "men" },
    { slug: "kemeja-kantor-wanita-sn-basic-green-series", role: "Pelayanan & administrasi wanita", gender: "women" },
  ],
  Bangunan: [
    { slug: "kemeja-kerja-casual-km", role: "Penjualan & kasir pria", gender: "men" },
    { slug: "kemeja-kerja-kk-014", role: "Pilihan lain untuk pelayanan", gender: "men" },
    { slug: "kemeja-kantor-wanita-sn-basic-green-series", role: "Penjualan & administrasi wanita", gender: "women" },
    { slug: "kemeja-kerja-kt-001", role: "Koordinasi gudang & pengantaran", gender: "men" },
  ],
  Perhotelan: [
    { slug: "frm", role: "Resepsionis & administrasi pria", gender: "men" },
    { slug: "kemeja-kantor-wanita-sn-basic-monochrome-series", role: "Resepsionis & administrasi wanita", gender: "women" },
    { slug: "kemeja-kerja-casual-km", role: "Pelayanan tamu pria", gender: "men" },
    { slug: "kemeja-kerja-kk-013", role: "Koordinasi operasional hotel", gender: "men" },
  ],
  Retail: [
    { slug: "kemeja-kerja-casual-km", role: "Penjualan & pelayanan pelanggan pria", gender: "men" },
    { slug: "sn-basic-shirt-blue-series", role: "Kasir & administrasi wanita", gender: "women" },
    { slug: "kemeja-kerja-kk-014", role: "Pilihan lain untuk pelayanan toko", gender: "men" },
    { slug: "kemeja-kerja-kt-001", role: "Koordinasi stok & penerimaan barang", gender: "men" },
  ],
};

const SELECTION_INTROS: Partial<Record<Industry, string>> = {
  Bengkel: "Bandingkan kemeja bengkel dan baju bengkel untuk teknisi, mekanik, serta tim pelayanan. Pilih model berdasarkan ruang gerak, bahan, panjang lengan, dan kebutuhan saku yang tercantum pada detail produk. Sesuaikan kebutuhan perlindungan dengan aturan area kerja Anda.",
  Corporate: "Bandingkan kemeja kerja untuk staf kantor, pelayanan, dan operasional perusahaan. Sesuaikan bahan, potongan, pilihan lengan, dan tabel ukuran setiap model dengan tugas tim serta identitas perusahaan.",
  Konstruksi: "Bandingkan kemeja konstruksi dan seragam proyek untuk administrasi, pengawas, serta koordinasi lapangan. Periksa spesifikasi produk dan persyaratan lokasi kerja sebelum menentukan kebutuhan seragam safety atau perlindungan khusus.",
  Manufaktur: "Bandingkan baju kerja untuk administrasi, produksi, dan koordinasi gudang. Pertimbangkan potongan, panjang lengan, serta ketentuan area produksi; pastikan spesifikasi setiap produk sesuai kebutuhan tugas tim.",
  Pertambangan: "Bandingkan kemeja tambang dan pilihan seragam untuk tim pertambangan, dari kantor hingga koordinasi lapangan. Kebutuhan reflektor, perlindungan khusus, dan sertifikasi harus diperiksa pada spesifikasi produk serta ketentuan lokasi kerja.",
  Kesehatan: "Bandingkan contoh seragam untuk pelayanan dan administrasi apotek atau klinik. Pilih bahan, panjang lengan, dan warna sesuai kebutuhan setiap peran.",
  Bangunan: "Bedakan kebutuhan tim penjualan, kasir, administrasi, serta koordinasi gudang dan pengantaran. Mulai dari contoh berikut, lalu sesuaikan dengan aktivitas tim Anda.",
  Perhotelan: "Mulai dari kebutuhan resepsionis, administrasi, pelayanan tamu, dan koordinasi operasional hotel. Bandingkan bahan, panjang lengan, serta pilihan warna untuk menyatukan identitas tim Anda.",
  Retail: "Pilih contoh seragam untuk penjualan, pelayanan pelanggan, kasir, administrasi, serta koordinasi stok toko. Sesuaikan model, panjang lengan, dan warna dengan tugas setiap anggota tim.",
};

export function industrySelectionIntro(industry: Industry) {
  return SELECTION_INTROS[industry];
}

export function hasIndustryRoleSelection(industry: Industry) {
  return Boolean(ROLE_CHOICES[industry]);
}

function modelFamily(product: OfissioProduct) {
  // These SN series share a model. Keep their full range in the industry catalog.
  if (product.slug.startsWith("kemeja-kantor-wanita-sn-basic-") || product.slug.startsWith("sn-basic-shirt-")) return "sn-basic";
  return product.modelCode?.trim().toLowerCase() || product.slug;
}

export function selectIndustryExamples(products: OfissioProduct[], industry: Industry) {
  const choices = ROLE_CHOICES[industry];
  if (!choices) return products.slice(0, 6).map((product) => ({ product, role: undefined }));

  const eligible = products.filter((product) => product.status === "published");
  const selected: { product: OfissioProduct; role: string | undefined }[] = [];
  const families = new Set<string>();
  for (const choice of choices) {
    const product = eligible.find((item) => item.slug === choice.slug && item.gender === choice.gender);
    if (!product || families.has(modelFamily(product))) continue;
    selected.push({ product, role: choice.role });
    families.add(modelFamily(product));
  }
  for (const product of eligible) {
    if (selected.length >= 6) break;
    if (families.has(modelFamily(product))) continue;
    selected.push({ product, role: "Pilihan lain untuk tim Anda" });
    families.add(modelFamily(product));
  }
  return selected;
}

export function industryExampleDetails(product: OfissioProduct) {
  const facts = [product.material?.trim()];
  const sleeves = product.variantOptions?.find((option) => isSleeveOption(option.name))?.values;
  if (sleeves?.length) facts.push(`Pilihan lengan: ${sleeves.join(" / ")}`);
  else if (product.sleeve_type === "short") facts.push("Lengan pendek");
  else if (product.sleeve_type === "long") facts.push("Lengan panjang");
  return facts.filter(Boolean).join(" · ");
}
