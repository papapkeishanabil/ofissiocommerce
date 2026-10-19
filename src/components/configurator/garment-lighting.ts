/** Directional studio light keeps white cotton bright while preserving folds. */
export function garmentLightingForColor(color?: string) {
  const white = /^#[fF]{6}$/.test(color ?? "");
  return white
    ? { ambient: 0.45, hemisphere: 0.4, key: 3, fill: 0.55 }
    : { ambient: 0.9, hemisphere: 0.7, key: 1.45, fill: 0.55 };
}
