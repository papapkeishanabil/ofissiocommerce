export type PackageBusiness = "kafe" | "restoran";

export type RoleProductGroup = {
  id: string;
  label: string;
  description: string;
  catalogTerm: string;
  keywords: readonly string[];
};

export type RolePackageConfig = {
  business: PackageBusiness;
  businessLabel: string;
  role: string;
  roleLabel: string;
  title: string;
  description: string;
  heroImage: string;
  heroAlt: string;
  recommendation: string;
  recommendedGroupIds: readonly string[];
  groups: readonly RoleProductGroup[];
};

const KAFE_COMMON = {
  business: "kafe" as const,
  businessLabel: "Kafe",
};

const RESTAURANT_COMMON = {
  business: "restoran" as const,
  businessLabel: "Restoran",
};

export const ROLE_PACKAGE_CONFIGS: readonly RolePackageConfig[] = [
  {
    ...KAFE_COMMON,
    role: "barista",
    roleLabel: "Barista",
    title: "Bangun Paket Seragam Barista",
    description: "Pilih sendiri polo, kemeja, apron, dan aksesori yang sesuai dengan alur kerja barista Anda.",
    heroImage: "/inspirasi/kafe-restoran/barista-depan.png",
    heroAlt: "Barista mengenakan polo dan apron cross-back di area coffee bar",
    recommendation: "Mulai dengan satu atasan dan satu apron untuk setiap anggota tim.",
    recommendedGroupIds: ["atasan", "apron"],
    groups: [
      { id: "atasan", label: "Atasan Barista", description: "Polo atau kemeja yang nyaman untuk aktivitas coffee bar.", catalogTerm: "Polo", keywords: ["polo", "kaos", "kemeja"] },
      { id: "apron", label: "Apron", description: "Apron cross-back atau apron layanan untuk perlindungan dan identitas visual.", catalogTerm: "Apron", keywords: ["apron"] },
      { id: "aksesori", label: "Aksesori", description: "Topi atau aksesori pelengkap untuk menyatukan tampilan tim.", catalogTerm: "Topi", keywords: ["topi", "cap", "hat"] },
    ],
  },
  {
    ...KAFE_COMMON,
    role: "front-counter",
    roleLabel: "Front Counter",
    title: "Bangun Paket Front Counter",
    description: "Susun tampilan pelayanan yang rapi untuk menyambut pelanggan dan menangani transaksi.",
    heroImage: "/inspirasi/kafe-restoran/tim-kafe-fokus-front-counter.png",
    heroAlt: "Front counter kafe mengenakan kemeja layanan dan apron pinggang",
    recommendation: "Kombinasikan kemeja layanan dengan apron pinggang yang mudah dipakai.",
    recommendedGroupIds: ["atasan", "apron"],
    groups: [
      { id: "atasan", label: "Kemeja Layanan", description: "Atasan yang rapi dan tetap nyaman selama melayani pelanggan.", catalogTerm: "Kemeja", keywords: ["kemeja", "blus", "blouse", "polo"] },
      { id: "apron", label: "Apron Pinggang", description: "Apron praktis untuk perlengkapan kasir dan pelayanan.", catalogTerm: "Apron", keywords: ["apron"] },
      { id: "outer", label: "Vest atau Outer", description: "Lapisan tambahan untuk membedakan front counter dari tim lainnya.", catalogTerm: "Vest", keywords: ["vest", "rompi", "outer"] },
    ],
  },
  {
    ...KAFE_COMMON,
    role: "kitchen",
    roleLabel: "Kitchen",
    title: "Bangun Paket Seragam Kitchen",
    description: "Pilih seragam dapur yang mudah bergerak, melindungi pakaian, dan tetap selaras dengan tim kafe.",
    heroImage: "/inspirasi/kafe-restoran/kitchen-seragam-lengkap.png",
    heroAlt: "Staf kitchen mengenakan atasan dapur, apron, celana, dan sepatu kerja",
    recommendation: "Gunakan atasan dapur dan apron sebagai kebutuhan inti tim kitchen.",
    recommendedGroupIds: ["atasan", "apron"],
    groups: [
      { id: "atasan", label: "Atasan Dapur", description: "Chef coat atau kemeja kerja untuk aktivitas persiapan makanan.", catalogTerm: "Chef", keywords: ["chef", "koki", "kitchen", "kemeja"] },
      { id: "apron", label: "Apron Dapur", description: "Perlindungan tambahan untuk aktivitas dapur dan plating.", catalogTerm: "Apron", keywords: ["apron"] },
      { id: "aksesori", label: "Penutup Kepala", description: "Topi atau cap kerja sebagai pelengkap standar kebersihan.", catalogTerm: "Topi", keywords: ["topi", "cap", "chef hat"] },
    ],
  },
  {
    ...KAFE_COMMON,
    role: "supervisor",
    roleLabel: "Supervisor",
    title: "Bangun Paket Supervisor Kafe",
    description: "Susun tampilan supervisor yang lebih tegas tanpa keluar dari identitas seragam tim.",
    heroImage: "/inspirasi/kafe-restoran/tim-kafe-fokus-supervisor.png",
    heroAlt: "Supervisor kafe mengenakan kemeja navy dan celana chino",
    recommendation: "Padukan kemeja premium dengan outer atau celana kerja yang rapi.",
    recommendedGroupIds: ["atasan", "outer"],
    groups: [
      { id: "atasan", label: "Atasan Supervisor", description: "Kemeja atau polo premium untuk aktivitas operasional dan pelayanan.", catalogTerm: "Kemeja", keywords: ["kemeja", "polo"] },
      { id: "outer", label: "Outer", description: "Jaket, blazer, atau vest untuk membedakan fungsi pengawasan.", catalogTerm: "Jaket", keywords: ["jaket", "blazer", "vest", "rompi"] },
      { id: "bawahan", label: "Bawahan", description: "Celana kerja atau chino yang mudah dipadukan dengan atasan tim.", catalogTerm: "Celana", keywords: ["celana", "chino", "pants"] },
    ],
  },
  {
    ...RESTAURANT_COMMON,
    role: "pelayan",
    roleLabel: "Pelayan",
    title: "Bangun Paket Seragam Pelayan",
    description: "Pilih kemeja formal, vest, dan apron bistro untuk pelayanan meja yang rapi dan mudah dikenali.",
    heroImage: "/inspirasi/kafe-restoran/tim-restoran-fokus-pelayan.png",
    heroAlt: "Pelayan restoran mengenakan kemeja formal, vest, dan apron bistro",
    recommendation: "Kemeja formal, vest pelayanan, dan apron bistro membentuk paket inti pelayan.",
    recommendedGroupIds: ["atasan", "vest", "apron"],
    groups: [
      { id: "atasan", label: "Kemeja Formal", description: "Kemeja pelayanan untuk tampilan meja yang bersih dan profesional.", catalogTerm: "Kemeja", keywords: ["kemeja", "shirt"] },
      { id: "vest", label: "Vest Pelayanan", description: "Lapisan formal yang membedakan pelayan dari role lain.", catalogTerm: "Vest", keywords: ["vest", "rompi"] },
      { id: "apron", label: "Apron Bistro", description: "Apron panjang atau bistro untuk perlengkapan pelayanan.", catalogTerm: "Apron", keywords: ["apron"] },
    ],
  },
  {
    ...RESTAURANT_COMMON,
    role: "host-captain",
    roleLabel: "Host / Captain",
    title: "Bangun Paket Host dan Captain",
    description: "Susun seragam penerima tamu dan captain yang formal, terstruktur, dan berbeda dari tim pelayanan meja.",
    heroImage: "/inspirasi/kafe-restoran/tim-restoran-fokus-host-captain.png",
    heroAlt: "Host restoran mengenakan blazer navy dan blus formal",
    recommendation: "Gunakan blazer layanan dan atasan formal sebagai identitas utama host atau captain.",
    recommendedGroupIds: ["blazer", "atasan"],
    groups: [
      { id: "blazer", label: "Blazer Layanan", description: "Blazer atau outer formal untuk area penerimaan tamu.", catalogTerm: "Blazer", keywords: ["blazer", "jas", "outer", "jaket"] },
      { id: "atasan", label: "Atasan Formal", description: "Kemeja atau blus yang nyaman dipakai di area depan restoran.", catalogTerm: "Kemeja", keywords: ["kemeja", "blus", "blouse"] },
      { id: "bawahan", label: "Bawahan Formal", description: "Celana atau rok formal yang melengkapi tampilan host.", catalogTerm: "Celana", keywords: ["celana", "rok", "pants", "skirt"] },
    ],
  },
  {
    ...RESTAURANT_COMMON,
    role: "chef",
    roleLabel: "Dapur / Chef",
    title: "Bangun Paket Seragam Chef",
    description: "Pilih chef coat, apron dapur, dan penutup kepala untuk kebutuhan tim produksi restoran.",
    heroImage: "/inspirasi/kafe-restoran/chef-restoran-seragam-lengkap.png",
    heroAlt: "Chef restoran mengenakan chef coat putih, apron, celana, dan sepatu dapur",
    recommendation: "Chef coat dan apron dapur menjadi komponen utama paket tim produksi.",
    recommendedGroupIds: ["atasan", "apron"],
    groups: [
      { id: "atasan", label: "Chef Coat", description: "Atasan dapur profesional untuk tim produksi dan plating.", catalogTerm: "Chef", keywords: ["chef", "koki", "cook"] },
      { id: "apron", label: "Apron Dapur", description: "Apron penuh untuk perlindungan selama operasional dapur.", catalogTerm: "Apron", keywords: ["apron"] },
      { id: "aksesori", label: "Chef Cap", description: "Penutup kepala untuk melengkapi standar seragam dapur.", catalogTerm: "Topi", keywords: ["topi", "cap", "hat"] },
    ],
  },
  {
    ...RESTAURANT_COMMON,
    role: "manager",
    roleLabel: "Manager",
    title: "Bangun Paket Manager Restoran",
    description: "Susun tampilan manager yang formal dan tetap terhubung dengan identitas visual seluruh tim restoran.",
    heroImage: "/inspirasi/kafe-restoran/tim-restoran-fokus-manager.png",
    heroAlt: "Manager restoran mengenakan blazer navy dan kemeja formal",
    recommendation: "Blazer restoran dan kemeja formal menjadi fondasi paket manager.",
    recommendedGroupIds: ["blazer", "atasan"],
    groups: [
      { id: "blazer", label: "Blazer Restoran", description: "Blazer atau jas ringan untuk fungsi pengelolaan dan penerimaan tamu.", catalogTerm: "Blazer", keywords: ["blazer", "jas", "outer", "jaket"] },
      { id: "atasan", label: "Kemeja Formal", description: "Atasan formal yang dapat digunakan dengan atau tanpa blazer.", catalogTerm: "Kemeja", keywords: ["kemeja", "shirt"] },
      { id: "bawahan", label: "Bawahan Formal", description: "Celana formal untuk melengkapi tampilan pengelola restoran.", catalogTerm: "Celana", keywords: ["celana", "pants"] },
    ],
  },
] as const;

export function getRolePackageConfig(business: string, role: string) {
  return ROLE_PACKAGE_CONFIGS.find(
    (item) => item.business === business && item.role === role,
  );
}

export function getBusinessRoleConfigs(business: PackageBusiness) {
  return ROLE_PACKAGE_CONFIGS.filter((item) => item.business === business);
}
