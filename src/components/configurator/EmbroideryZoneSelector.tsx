// src/components/configurator/EmbroideryZoneSelector.tsx
"use client";

import { EMBROIDERY_ZONES, zoneLabel, type EmbroideryZone } from "@/types/uniform-3d";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmbroideryZoneSelectorProps {
  selectedZone: EmbroideryZone | null;
  onSelect: (zone: EmbroideryZone) => void;
  placedZones: Set<EmbroideryZone>;
}

export function EmbroideryZoneSelector({
  selectedZone,
  onSelect,
  placedZones,
}: EmbroideryZoneSelectorProps) {
  return (
    <div>
      <p className="type-eyebrow mb-2 text-ink-subtle">Zona bordir</p>
      <div className="grid grid-cols-2 gap-1.5">
        {EMBROIDERY_ZONES.map((z) => {
          const isPlaced = placedZones.has(z);
          const isSelected = selectedZone === z;
          return (
            <button
              key={z}
              type="button"
              onClick={() => onSelect(z)}
              aria-pressed={isSelected}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-semibold transition-all",
                isSelected
                  ? "border-brand-700 bg-brand-50 text-brand-700 ring-1 ring-brand-200"
                  : "border-line bg-surface text-ink hover:border-brand-300",
              )}
            >
              {isPlaced ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-ochre-500" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-ink-subtle" />
              )}
              {zoneLabel(z)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
