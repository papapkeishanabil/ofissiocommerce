// src/features/moq-settings/moq-settings.types.ts
// Master MOQ per rute pengerjaan (STK/CUS/PRO) + batas minimum bordir.
// Pure data — diimport dari client & server (tanpa "server-only").

export interface MoqSettings {
  /** Rute fulfillment (Ready Stock / STK) — default 1: beli langsung mulai 1 pcs. */
  fulfillment: number;
  /** Rute customization (CUS) — default 1: tanpa bordir ikut nilai ini. */
  customization: number;
  /** Rute production (PRO / Full Custom) — acuan warning 48 pcs, bukan blokir. */
  production: number;
  /** Batas KERAS bordir: line dengan bordir minimal sebanyak ini (default 8). */
  embroidery: number;
}

export const DEFAULT_MOQ_SETTINGS: MoqSettings = {
  fulfillment: 1,
  customization: 1,
  production: 48,
  embroidery: 8,
};

const MOQ_KEYS = ["fulfillment", "customization", "production", "embroidery"] as const;

function coerceMoqField(value: unknown, fallback: number): number {
  const parsed = Math.trunc(Number(value));
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, 1_000_000);
}

/** Normalisasi payload apa pun (DB row / API / partial) jadi MoqSettings yang valid. */
export function normalizeMoqSettings(raw: unknown): MoqSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_MOQ_SETTINGS };
  const record = raw as Record<string, unknown>;
  const settings = { ...DEFAULT_MOQ_SETTINGS };
  for (const key of MOQ_KEYS) {
    settings[key] = coerceMoqField(record[key], DEFAULT_MOQ_SETTINGS[key]);
  }
  return settings;
}
