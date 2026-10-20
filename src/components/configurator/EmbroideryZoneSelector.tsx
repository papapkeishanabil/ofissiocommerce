// src/components/configurator/EmbroideryZoneSelector.tsx
"use client";

import Image from "next/image";
import { zoneLabel, type EmbroideryZone } from "@/types/uniform-3d";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./Studio.module.css";

interface EmbroideryZoneSelectorProps {
  heading: string;
  description: string;
  selectedZone: EmbroideryZone | null;
  onSelect: (zone: EmbroideryZone) => void;
  placedZones: Set<EmbroideryZone>;
  zones: EmbroideryZone[];
}

export function EmbroideryZoneSelector({
  heading,
  description,
  selectedZone,
  onSelect,
  placedZones,
  zones,
}: EmbroideryZoneSelectorProps) {
  return (
    <section aria-labelledby="embroidery-zone-heading">
      <h3 id="embroidery-zone-heading" className={styles.label}>{heading}</h3>
      <p className={styles.help}>{description}</p>
      <div
        role="group"
        aria-label="Zona bordir"
        className={styles.zones}
      >
        {zones.map((z) => {
          const isPlaced = placedZones.has(z);
          const isSelected = selectedZone === z;
          const label = customerZoneLabel(z);
          return (
            <button
              key={z}
              type="button"
              onClick={() => onSelect(z)}
              aria-pressed={isSelected}
              aria-label={`${isPlaced ? "Edit" : "Tambah"} zona ${label}`}
              className={cn("group", styles.zone)}
            >
              <ZonePositionIcon zone={z} />
              <span className={styles.zoneName}>{label}</span>
              <span
                className={styles.srOnly}
                data-state={isPlaced ? "placed" : isSelected ? "selected" : "available"}
              >
                {isPlaced ? "Ditambahkan" : isSelected ? "Dipilih" : "Tambah"}
              </span>
              {isPlaced || isSelected ? (
                <CheckCircle2
                  className={cn(styles.zoneCheck, isPlaced && styles.zoneCheckPlaced)}
                  aria-hidden="true"
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function customerZoneLabel(zone: EmbroideryZone) {
  if (zone === "left_sleeve") return "Lengan Kiri";
  if (zone === "right_sleeve") return "Lengan Kanan";
  return zoneLabel(zone);
}

const ZONE_ICON_ASSETS: Record<EmbroideryZone, string> = {
  left_chest: "/assets/embroidery-zones/zone-right-chest.png",
  right_chest: "/assets/embroidery-zones/zone-right-chest.png",
  left_sleeve: "/assets/embroidery-zones/zone-left-sleeve.png",
  right_sleeve: "/assets/embroidery-zones/zone-left-sleeve.png",
  upper_back: "/assets/embroidery-zones/zone-upper-back.png",
  middle_back: "/assets/embroidery-zones/zone-center-back-v2.png",
};

function ZonePositionIcon({ zone }: { zone: EmbroideryZone }) {
  const isSleeve = zone === "left_sleeve" || zone === "right_sleeve";
  const isMirrored = zone === "left_chest" || zone === "right_sleeve";

  return (
    <span
      aria-hidden="true"
      className={cn(
        styles.zoneIcon,
        // Mirror the frame so the image's size/hover scale cannot override it.
        isMirrored && "-scale-x-100",
      )}
    >
      <Image
        src={ZONE_ICON_ASSETS[zone]}
        alt=""
        width={96}
        height={96}
        className={cn(
          "h-11 w-11 object-contain transition-transform duration-200",
          isSleeve
            ? "scale-125 group-hover:scale-[1.3]"
            : "scale-105 group-hover:scale-110",
        )}
      />
    </span>
  );
}
