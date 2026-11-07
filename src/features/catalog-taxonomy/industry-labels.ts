/** Presentation only: persisted identities and URLs must remain stable. */
const INDUSTRY_LABELS: Record<string, string> = {
  corporate: "Perkantoran dan Perusahaan", office: "Perkantoran dan Perusahaan",
  mining: "Pertambangan", manufacturing: "Manufaktur dan Pabrik",
  hospitality: "Perhotelan", healthcare: "Kesehatan", education: "Pendidikan",
  construction: "Konstruksi", logistics: "Logistik dan Pergudangan",
  security: "Keamanan", government: "Pemerintahan", retail: "Ritel dan Pertokoan",
  "food-beverage": "Makanan dan Minuman", "food-and-beverage": "Makanan dan Minuman", "f-b": "Makanan dan Minuman", fnb: "Makanan dan Minuman",
  bengkel: "Bengkel", grosir: "Toko Grosir dan Distributor", laundry: "Penatu dan Laundry",
  salon: "Salon dan Kecantikan", bangunan: "Toko Bangunan", sparepart: "Toko Suku Cadang",
  petshop: "Toko Perlengkapan Hewan", maritim: "Maritim", ekspedisi: "Ekspedisi",
  bumn: "BUMN dan Instansi",
};

function key(value: string) {
  return value.trim().toLocaleLowerCase("id-ID").replace(/&/g, " ").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
}

export function industryLabel(slug: string, savedName?: string) {
  const name = savedName?.trim();
  // Preserve team-authored labels; translate only known default/raw names.
  if (name && !INDUSTRY_LABELS[key(name)] && key(name) !== key(slug)) return name;
  return INDUSTRY_LABELS[key(slug)] ?? (name || slug.trim().replace(/[-_]+/g, " "));
}
