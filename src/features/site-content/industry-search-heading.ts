import type { Industry } from "@/types/industry";
import type { OfissioProduct } from "@/features/products/product.types";
import { INSPIRATION_ROUTES } from "./industry-inspiration.routes";

// Describe the existing product selection, without implying certification,
// special protection, stock, price tiers, or garments absent from that selection.
const SHIRT_HEADINGS: Record<Industry, string> = {
  Bengkel: "Kemeja Bengkel dan Seragam Teknisi",
  Kesehatan: "Kemeja dan Seragam Staf Apotek dan Klinik",
  Retail: "Kemeja dan Seragam Karyawan Toko",
  "F&B": "Kemeja dan Seragam Staf Restoran dan Kafe",
  Grosir: "Kemeja dan Seragam Staf Grosir dan Distributor",
  Laundry: "Kemeja dan Seragam Karyawan Laundry",
  Salon: "Kemeja dan Seragam Staf Salon",
  Bangunan: "Kemeja dan Seragam Staf Toko Bangunan",
  Sparepart: "Kemeja dan Seragam Staf Toko Suku Cadang",
  Petshop: "Kemeja dan Seragam Karyawan Petshop",
  Ekspedisi: "Kemeja dan Seragam Logistik dan Ekspedisi",
  Security: "Kemeja dan Pilihan Seragam Tim Keamanan",
  Corporate: "Kemeja Kantor dan Seragam Perusahaan",
  Pertambangan: "Kemeja Tambang dan Seragam Pertambangan",
  Konstruksi: "Kemeja Konstruksi dan Seragam Proyek",
  Manufaktur: "Kemeja dan Seragam Kerja Pabrik",
  Perhotelan: "Kemeja Hotel dan Seragam Perhotelan",
  BUMN: "Kemeja dan Seragam BUMN dan Instansi",
  Maritim: "Kemeja dan Pilihan Seragam Tim Maritim",
  Pendidikan: "Kemeja dan Seragam Pengajar dan Staf Pendidikan",
};

export function industrySearchHeading(industry: Industry, products: Pick<OfissioProduct, "name">[]) {
  return products.some(product => /\bkemeja\b/iu.test(product.name))
    ? SHIRT_HEADINGS[industry]
    : `Pilihan Seragam ${INSPIRATION_ROUTES[industry].label}`;
}
