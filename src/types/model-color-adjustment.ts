export interface ModelColorAdjustment {
  /** Global tone-mapping exposure applied by the WebGL renderer. */
  exposure: number;
  /** Texture-backed fill light retained for compatibility with darker GLBs. */
  emissiveIntensity: number;
  /** Texture brightness multiplier. 1 is neutral. */
  brightness: number;
  /** Texture saturation multiplier. 1 is neutral. */
  saturation: number;
  /** Texture hue rotation in degrees. 0 is neutral. */
  hue: number;
  /** Warm/cool correction from -1 (cool) to 1 (warm). */
  temperature: number;
}

/**
 * Existing exposure/emissive defaults intentionally remain unchanged so a
 * product only changes appearance after an admin saves its own calibration.
 */
export const DEFAULT_MODEL_COLOR_ADJUSTMENT: ModelColorAdjustment = {
  exposure: 1.15,
  emissiveIntensity: 0.6,
  brightness: 1,
  saturation: 1,
  hue: 0,
  temperature: 0,
};

export function normalizeModelColorAdjustment(
  value?: Partial<ModelColorAdjustment> | null,
): ModelColorAdjustment {
  return {
    exposure: clampFinite(value?.exposure, 0.3, 2, DEFAULT_MODEL_COLOR_ADJUSTMENT.exposure),
    emissiveIntensity: clampFinite(
      value?.emissiveIntensity,
      0,
      1,
      DEFAULT_MODEL_COLOR_ADJUSTMENT.emissiveIntensity,
    ),
    brightness: clampFinite(value?.brightness, 0.5, 1.5, DEFAULT_MODEL_COLOR_ADJUSTMENT.brightness),
    saturation: clampFinite(value?.saturation, 0, 1.5, DEFAULT_MODEL_COLOR_ADJUSTMENT.saturation),
    hue: clampFinite(value?.hue, -60, 60, DEFAULT_MODEL_COLOR_ADJUSTMENT.hue),
    temperature: clampFinite(value?.temperature, -1, 1, DEFAULT_MODEL_COLOR_ADJUSTMENT.temperature),
  };
}

function clampFinite(value: number | undefined, min: number, max: number, fallback: number) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, Number(value))) : fallback;
}
