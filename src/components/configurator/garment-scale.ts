/** Legacy scale remains for products without a confirmed measurement chart. */
export const LEGACY_MODEL_UNITS_PER_CM = 0.03;

/** Customer supplied KM chart, 02 August 2023; confirmed for KL-007.
 * Sleeve measurements are deliberately omitted: the chart depicts short sleeves.
 * Chest/shoulder are reference measurements, not total mesh width (includes arms).
 */
export const KL007_REFERENCE = {
  size: "L",
  lengthCm: 70,
  chestWidthCm: 52,
  shoulderWidthCm: 45,
} as const;

export function garmentReference(sku: string) {
  return sku.trim().toUpperCase() === "KL-007" ? KL007_REFERENCE : undefined;
}

/** Visual estimate only: model bounds include the collar, whereas the chart's
 * length starts at the shoulder. Exact calibration needs measured mesh landmarks.
 * Never stretch the mesh to force independent chest/shoulder proportions.
 */
export function modelUnitsPerCm(modelHeight: number, referenceLengthCm?: number) {
  return Number.isFinite(modelHeight) && modelHeight > 0 &&
    referenceLengthCm !== undefined && Number.isFinite(referenceLengthCm) && referenceLengthCm > 0
    ? modelHeight / referenceLengthCm
    : LEGACY_MODEL_UNITS_PER_CM;
}
