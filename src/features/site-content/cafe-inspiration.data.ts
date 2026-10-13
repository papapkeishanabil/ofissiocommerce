import { Coffee, UserRound, ChefHat, Star, UtensilsCrossed, type LucideIcon } from "lucide-react";
export type BusinessKind = "cafe" | "restaurant";
export type RoleFocus = "barista" | "frontCounter" | "kitchen" | "supervisor";
export type PhotoMode = "uniform" | "team" | "allTeam";

export const KITCHEN_DETAIL_IMAGE = "/inspirasi/kafe-restoran/kitchen-seragam-lengkap.png";
export const RESTAURANT_CHEF_DETAIL_IMAGE = "/inspirasi/kafe-restoran/chef-restoran-seragam-lengkap.png";
export const CAFE_TEAM_OVERVIEW_IMAGE = "/inspirasi/kafe-restoran/tim-kafe-ofissio.png";
export const RESTAURANT_TEAM_OVERVIEW_IMAGE = "/inspirasi/kafe-restoran/tim-restoran-ofissio.png";

export type RoleContent = {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  contents: readonly [string, string, string];
  material: string;
  colors: readonly string[];
  focus: RoleFocus;
  focusImage: string;
  detailImage?: string;
  detailAlt?: string;
};

export const CAFE_ROLES: readonly RoleContent[] = [
  {
    id: "barista",
    name: "Barista",
    description: "Tampilan nyaman dan profesional untuk aktivitas di balik coffee bar.",
    icon: Coffee,
    contents: ["Polo premium", "Apron cross-back", "Bordir logo dada"],
    material: "Kain pique & canvas twill",
    colors: ["#06183b", "#b8a184", "#2d3035"],
    focus: "barista",
    focusImage: "/inspirasi/kafe-restoran/tim-kafe-fokus-barista.png",
  },
  {
    id: "front-counter",
    name: "Front Counter",
    description: "Identitas yang rapi untuk menyambut pelanggan dan menangani transaksi.",
    icon: UserRound,
    contents: ["Kemeja layanan", "Apron pinggang", "Bordir logo dada"],
    material: "Oxford ringan & canvas twill",
    colors: ["#06183b", "#d7c2a2", "#f2eee4"],
    focus: "frontCounter",
    focusImage: "/inspirasi/kafe-restoran/tim-kafe-fokus-front-counter.png",
  },
  {
    id: "kitchen",
    name: "Kitchen",
    description: "Seragam berbeda untuk tim pengolahan, tetap selaras dengan identitas kafe.",
    icon: ChefHat,
    contents: ["Chef coat", "Apron dapur", "Penutup kepala"],
    material: "Twill ringan & canvas",
    colors: ["#121418", "#6f604f", "#f3f0e9"],
    focus: "kitchen",
    focusImage: "/inspirasi/kafe-restoran/tim-kafe-fokus-kitchen.png",
    detailImage: KITCHEN_DETAIL_IMAGE,
    detailAlt: "Model Kitchen dengan penutup kepala, chef coat, apron dapur, celana, dan sepatu terlihat utuh",
  },
  {
    id: "supervisor",
    name: "Supervisor",
    description: "Tampilan lebih tegas untuk memimpin operasional tanpa keluar dari palet tim.",
    icon: Star,
    contents: ["Kemeja layanan", "Celana chino", "Bordir logo dada"],
    material: "Oxford premium",
    colors: ["#06183b", "#b9a98f", "#efebe2"],
    focus: "supervisor",
    focusImage: "/inspirasi/kafe-restoran/tim-kafe-fokus-supervisor.png",
  },
] as const;

export const RESTAURANT_ROLES: readonly RoleContent[] = [
  {
    id: "service",
    name: "Pelayan",
    description: "Seragam pelayanan yang mudah dikenali dan tetap nyaman selama jam operasional.",
    icon: UtensilsCrossed,
    contents: ["Kemeja formal", "Vest pelayanan", "Apron bistro"],
    material: "Oxford premium & suiting",
    colors: ["#06183b", "#b8a184", "#f3f0e9"],
    focus: "barista",
    focusImage: "/inspirasi/kafe-restoran/tim-restoran-fokus-pelayan.png",
  },
  {
    id: "host",
    name: "Host / Captain",
    description: "Tampilan terstruktur untuk menyambut tamu dan mengarahkan pelayanan.",
    icon: UserRound,
    contents: ["Blazer layanan", "Blus formal", "Name tag"],
    material: "Tropical suiting & silky twill",
    colors: ["#06183b", "#d8d0c3", "#6f604f"],
    focus: "frontCounter",
    focusImage: "/inspirasi/kafe-restoran/tim-restoran-fokus-host-captain.png",
  },
  {
    id: "chef",
    name: "Dapur / Chef",
    description: "Seragam khusus tim dapur yang membedakan fungsi kerja secara jelas.",
    icon: ChefHat,
    contents: ["Chef coat", "Apron dapur", "Chef cap"],
    material: "Twill ringan & canvas",
    colors: ["#121418", "#f3f0e9", "#7c6952"],
    focus: "kitchen",
    focusImage: "/inspirasi/kafe-restoran/tim-restoran-fokus-chef.png",
    detailImage: RESTAURANT_CHEF_DETAIL_IMAGE,
    detailAlt: "Model Dapur dan Chef dengan penutup kepala, chef coat, apron dapur, celana, dan sepatu terlihat utuh",
  },
  {
    id: "manager",
    name: "Manager",
    description: "Penampilan profesional untuk pengelola dengan warna yang tetap terhubung ke tim.",
    icon: Star,
    contents: ["Blazer restoran", "Kemeja formal", "Name tag"],
    material: "Tropical suiting & oxford",
    colors: ["#06183b", "#c6b79f", "#f3f0e9"],
    focus: "supervisor",
    focusImage: "/inspirasi/kafe-restoran/tim-restoran-fokus-manager.png",
  },
] as const;

