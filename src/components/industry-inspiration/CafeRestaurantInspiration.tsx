"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Layers3,
  Shirt,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import styles from "./CafeRestaurantInspiration.module.css";

export type { BusinessKind } from "@/features/site-content/cafe-inspiration.data";
import { CAFE_ROLES, RESTAURANT_ROLES, KITCHEN_DETAIL_IMAGE, RESTAURANT_CHEF_DETAIL_IMAGE, CAFE_TEAM_OVERVIEW_IMAGE, RESTAURANT_TEAM_OVERVIEW_IMAGE, type BusinessKind, type RoleFocus, type PhotoMode, type RoleContent } from "@/features/site-content/cafe-inspiration.data";
import { cafeAnnotations } from "@/features/site-content/cafe-inspiration-pins";
import type { IndustryInspirationData } from "@/features/site-content/content.schema";
import { CafeAnnotatedPhoto } from "./CafeAnnotatedPhoto";
const CONTENT_ICONS: readonly LucideIcon[] = [Shirt, Layers3, BadgeCheck];
const FOCUS_CLASSES: Record<RoleFocus, string> = {
  barista: styles.focusBarista!,
  frontCounter: styles.focusFrontCounter!,
  kitchen: styles.focusKitchen!,
  supervisor: styles.focusSupervisor!,
};

export function CafeRestaurantInspiration({ initialBusiness = "cafe", placements, children }: { initialBusiness?: BusinessKind; placements?: IndustryInspirationData["cafePlacements"]; children?: ReactNode }) {
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

  const pins = cafeAnnotations(business, activeRole, showUniform ? "uniform" : "team", placements);

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
            <CafeAnnotatedPhoto image={activePhoto} alt={activePhotoAlt} ratio={business === "cafe" && !showUniform ? 1586 / 992 : 1.5} annotations={showAllTeam ? [] : pins} />
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
      {children}
    </main>
  );
}
