"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Layers3,
  Shirt,
  Star,
  UserRound,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import styles from "./CafeRestaurantInspiration.module.css";

export type BusinessKind = "cafe" | "restaurant";
type RoleFocus = "barista" | "frontCounter" | "kitchen" | "supervisor";
type PhotoMode = "uniform" | "team" | "allTeam";

const KITCHEN_DETAIL_IMAGE = "/inspirasi/kafe-restoran/kitchen-seragam-lengkap.png";
const RESTAURANT_CHEF_DETAIL_IMAGE = "/inspirasi/kafe-restoran/chef-restoran-seragam-lengkap.png";
const CAFE_TEAM_OVERVIEW_IMAGE = "/inspirasi/kafe-restoran/tim-kafe-ofissio.png";
const RESTAURANT_TEAM_OVERVIEW_IMAGE = "/inspirasi/kafe-restoran/tim-restoran-ofissio.png";

type RoleContent = {
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

const CAFE_ROLES: readonly RoleContent[] = [
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

const RESTAURANT_ROLES: readonly RoleContent[] = [
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

const CONTENT_ICONS: readonly LucideIcon[] = [Shirt, Layers3, BadgeCheck];
const FOCUS_CLASSES: Record<RoleFocus, string> = {
  barista: styles.focusBarista!,
  frontCounter: styles.focusFrontCounter!,
  kitchen: styles.focusKitchen!,
  supervisor: styles.focusSupervisor!,
};

export function CafeRestaurantInspiration({ initialBusiness = "cafe" }: { initialBusiness?: BusinessKind }) {
  const [business, setBusiness] = useState<BusinessKind>(initialBusiness);
  const roles = business === "cafe" ? CAFE_ROLES : RESTAURANT_ROLES;
  const [activeRoleId, setActiveRoleId] = useState(
    initialBusiness === "restaurant" ? RESTAURANT_ROLES[0]!.id : CAFE_ROLES[0]!.id,
  );
  const [photoMode, setPhotoMode] = useState<PhotoMode>("allTeam");

  const activeIndex = Math.max(0, roles.findIndex((role) => role.id === activeRoleId));
  const activeRole = roles[activeIndex] ?? roles[0]!;
  const teamOverviewImage = business === "cafe"
    ? CAFE_TEAM_OVERVIEW_IMAGE
    : RESTAURANT_TEAM_OVERVIEW_IMAGE;
  const showUniform = photoMode === "uniform" && Boolean(activeRole.detailImage);
  const showAllTeam = photoMode === "allTeam";
  const activePhoto = showAllTeam
    ? teamOverviewImage
    : showUniform
      ? activeRole.detailImage!
      : activeRole.focusImage;
  const activePhotoAlt = showAllTeam
    ? `Seluruh tim ${business === "cafe" ? "kafe" : "restoran"} tampil berwarna dengan seragam yang selaras untuk setiap peran`
    : showUniform
      ? activeRole.detailAlt!
      : `Fokus seragam ${activeRole.name}; peran lain ditampilkan monokrom`;

  const restaurantRoleRoutes: Record<string, string> = {
    service: "pelayan",
    host: "host-captain",
    chef: "chef",
    manager: "manager",
  };
  const packageRole = business === "cafe"
    ? activeRole.id
    : restaurantRoleRoutes[activeRole.id] ?? activeRole.id;
  const packageHref = `/paket/${business === "cafe" ? "kafe" : "restoran"}/${packageRole}`;

  const callouts = useMemo(() => {
    if (activeRole.id === "barista") return ["Polo breathable", "Apron cross-back", "Bordir logo"];
    if (activeRole.id === "chef" || activeRole.id === "kitchen") return ["Penutup kepala", "Chef coat", "Apron dapur"];
    return [activeRole.contents[0], activeRole.contents[1], activeRole.contents[2]];
  }, [activeRole]);

  const chooseBusiness = (nextBusiness: BusinessKind) => {
    const nextRoles = nextBusiness === "cafe" ? CAFE_ROLES : RESTAURANT_ROLES;
    const nextRole = nextRoles[0]!;
    setBusiness(nextBusiness);
    setActiveRoleId(nextRole.id);
    setPhotoMode("allTeam");
  };

  const chooseRole = (role: RoleContent) => {
    setActiveRoleId(role.id);
    setPhotoMode(role.detailImage ? "uniform" : "team");
  };

  const moveRole = (direction: -1 | 1) => {
    const nextIndex = (activeIndex + direction + roles.length) % roles.length;
    chooseRole(roles[nextIndex]!);
  };

  const preloadRoleImages = (role: RoleContent) => {
    [role.focusImage, role.detailImage].forEach((src) => {
      if (!src) return;
      const image = new window.Image();
      image.src = src;
    });
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="cafe-restaurant-title">
        <span className={styles.preloadPhoto} aria-hidden="true">
          <Image src={KITCHEN_DETAIL_IMAGE} alt="" fill priority quality={95} sizes="(max-width: 900px) 100vw, 68vw" />
        </span>
        <span className={styles.preloadPhoto} aria-hidden="true">
          <Image src={CAFE_TEAM_OVERVIEW_IMAGE} alt="" fill priority quality={95} sizes="(max-width: 900px) 100vw, 68vw" />
        </span>
        <span className={styles.preloadPhoto} aria-hidden="true">
          <Image src={RESTAURANT_TEAM_OVERVIEW_IMAGE} alt="" fill priority quality={95} sizes="(max-width: 900px) 100vw, 68vw" />
        </span>
        <span className={styles.preloadPhoto} aria-hidden="true">
          <Image src={RESTAURANT_CHEF_DETAIL_IMAGE} alt="" fill priority quality={95} sizes="(max-width: 900px) 100vw, 68vw" />
        </span>
        <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
          <Link href="/">Beranda</Link><span>/</span><Link href="/inspirasi">Inspirasi</Link><span>/</span><span>Kafe &amp; Restoran</span>
        </nav>

        <div className={styles.introGrid}>
          <div>
            <p className={styles.eyebrow}>Inspirasi Kafe &amp; Restoran</p>
            <h1 id="cafe-restaurant-title">Satu Identitas, Berbeda Peran.</h1>
            <p className={styles.lede}>
              {business === "cafe"
                ? "Dari barista, front counter, dapur, hingga manager—semua dapat tampil selaras tanpa harus mengenakan seragam yang persis sama."
                : "Dari pelayan, host, dapur, hingga manager—setiap peran memiliki seragam berbeda dalam satu identitas restoran."}
            </p>
          </div>

          <div className={styles.businessArea}>
            <div className={styles.businessSwitch} aria-label="Pilih jenis usaha">
              <button type="button" aria-pressed={business === "cafe"} onClick={() => chooseBusiness("cafe")} className={business === "cafe" ? styles.businessActive : ""}>
                <Coffee aria-hidden="true" /> Kafe
              </button>
              <button type="button" aria-pressed={business === "restaurant"} onClick={() => chooseBusiness("restaurant")} className={business === "restaurant" ? styles.businessActive : ""}>
                <UtensilsCrossed aria-hidden="true" /> Restoran
              </button>
            </div>
            <p>{business === "cafe" ? "Lihat inspirasi seragam untuk tim kafe yang fungsional, nyaman, dan tetap mencerminkan identitas bisnis Anda." : "Lihat susunan seragam restoran yang membedakan peran pelayanan, dapur, dan pengelola dengan satu identitas."}</p>
          </div>
        </div>

        <div className={styles.lookbook}>
          <nav className={styles.roleRail} aria-label={`Peran tim ${business === "cafe" ? "kafe" : "restoran"}`}>
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <button key={role.id} type="button" aria-pressed={activeRole.id === role.id} onMouseEnter={() => preloadRoleImages(role)} onFocus={() => preloadRoleImages(role)} onClick={() => chooseRole(role)} className={activeRole.id === role.id ? styles.roleActive : ""}>
                  <Icon aria-hidden="true" />
                  <span>{role.name}</span>
                </button>
              );
            })}
          </nav>

          <div
            className={`${styles.photoFrame} ${FOCUS_CLASSES[activeRole.focus]} ${showUniform ? styles.uniformView : ""} ${showAllTeam ? styles.allTeamView : ""}`}
            data-role={activeRole.id}
          >
            <Image key={activePhoto} src={activePhoto} alt={activePhotoAlt} fill priority quality={95} sizes="(max-width: 900px) 100vw, 68vw" className={styles.teamPhoto} />
            <p className={styles.focusStatus} aria-live="polite">
              <span>{showAllTeam ? "Identitas tim" : showUniform ? "Seragam lengkap" : "Fokus seragam"}</span>
              <strong>{showAllTeam ? "Semua peran" : activeRole.name}</strong>
            </p>
            <div className={`${styles.photoModeSwitch} ${activeRole.detailImage ? styles.photoModeThree : ""}`} aria-label={`Pilihan tampilan ${activeRole.name}`}>
              {activeRole.detailImage ? (
                <button type="button" aria-pressed={photoMode === "uniform"} onClick={() => setPhotoMode("uniform")}>Tampilan Seragam</button>
              ) : null}
              <button type="button" aria-pressed={photoMode === "team"} onClick={() => setPhotoMode("team")}>Fokus dalam Tim</button>
              <button type="button" aria-pressed={photoMode === "allTeam"} onClick={() => setPhotoMode("allTeam")}>Semua Tim</button>
            </div>
            {!showAllTeam ? (
              <>
                <div className={`${styles.callout} ${styles.calloutOne}`}><span>1</span>{callouts[0]}</div>
                <div className={`${styles.callout} ${styles.calloutTwo}`}><span>2</span>{callouts[1]}</div>
                <div className={`${styles.callout} ${styles.calloutThree}`}><span>3</span>{callouts[2]}</div>
              </>
            ) : null}
          </div>

          <aside className={styles.roleDetail} aria-live="polite">
            <div className={styles.detailTopline}>
              <span>Peran</span>
              <div>
                <button type="button" onClick={() => moveRole(-1)} aria-label="Peran sebelumnya"><ChevronLeft aria-hidden="true" /></button>
                <span>{activeIndex + 1} / {roles.length}</span>
                <button type="button" onClick={() => moveRole(1)} aria-label="Peran berikutnya"><ChevronRight aria-hidden="true" /></button>
              </div>
            </div>

            <h2>{activeRole.name}</h2>
            <p className={styles.roleDescription}>{activeRole.description}</p>

            <div className={styles.contents}>
              <p>Isi per staf</p>
              {activeRole.contents.map((item, index) => {
                const Icon = CONTENT_ICONS[index]!;
                return <div key={item}><Icon aria-hidden="true" /><span>{item}</span></div>;
              })}
            </div>

            <div className={styles.detailMeta}>
              <div><p>Pilihan warna</p><div className={styles.swatches}>{activeRole.colors.map((color) => <span key={color} style={{ backgroundColor: color }} aria-label={`Warna ${color}`} />)}</div></div>
              <div><p>Material</p><strong>{activeRole.material}</strong></div>
            </div>

            <Link href={packageHref} className={styles.primaryAction}>
              Lihat Paket {activeRole.name} <ArrowRight aria-hidden="true" />
            </Link>
            <button type="button" className={styles.compareAction} onClick={() => document.getElementById("paket-lengkap")?.scrollIntoView({ behavior: "smooth" })}>
              Bandingkan Semua Peran <ArrowRight aria-hidden="true" />
            </button>
          </aside>
        </div>

        <div id="paket-lengkap" className={styles.completePackage}>
          <div><p>Paket {business === "cafe" ? "Kafe" : "Restoran"} Complete</p><h2>4 peran, satu identitas visual.</h2></div>
          <p>Kombinasi seragam untuk tim pelayanan, operasional, dapur, dan supervisor yang saling melengkapi.</p>
          <Link href={business === "cafe" ? "/paket/kafe/barista" : "/paket/restoran/pelayan"}>Susun Paket Lengkap <ArrowRight aria-hidden="true" /></Link>
        </div>
      </section>
    </main>
  );
}
