import type { CSSProperties } from "react";

const COLOR_SWATCHES: Record<string, string> = {
  "Army Green": "#535d44",
  "Hijau Army": "#535d44",
  "cream khaki": "#e9e1d5",
  "khaki cream": "#e9e1d5",
  "khaki krem": "#e9e1d5",
  "tan": "#bc7f45",
  "biru dongker": "#1e3a8a",
  "dongker": "#1e3a8a",
  "orange": "#f97316",
  "lime": "#84cc16",
  "hijau stabilo": "#84cc16",
  "hijau tua": "#166534",
  "green": "#16a34a",
  "biru royal": "#1d4ed8",
  "blue": "#2563eb",
  "merah marun": "#7f1d1d",
  "merah muda": "#f9a8d4",
  "red": "#dc2626",
  "dark gray": "#475569",
  "gray": "#94a3b8",
  "cream": "#f2e5c4",
  "coklat": "#92400e",
  "brown": "#92400e",
  "purple": "#7e22ce",
  "toska": "#0d9488",
  "zaitun": "#4d7c0f",
  "abu tua": "#555963",
  "abu asap": "#a1aab6",
  "abu muda": "#ced2d6",
  "abu kebiruan": "#879eae",
  "purple grey": "#aaa0b2",
  "biru navy": "#24354c",
  "baby blue": "#a6c5df",
  "biru aqua": "#68c6d0",
  "biru benhur": "#2853b8",
  "biru langit": "#76bce7",
  "biru muda": "#b1d4e8",
  "biru wardah": "#61a8bc",
  "butter yellow": "#f3e5a4",
  "daisy yellow": "#f1cd54",
  "kuning mustard": "#bf9528",
  "lilac": "#c8aed8",
  "ungu manggis": "#674060",
  "army": "#535d44",
  "camel": "#bc7f45",
  "putih saku": "#f8fafc",
  "Fuschia": "#da738e",
  "Fuchsia": "#da738e",
  "Apricot": "#edb8a7",
  "Salmon": "#dcaea3",
  "Dusty Pink": "#bf939b",
  "Peach": "#dab3ac",
  "Rose Pink": "#e8b5cc",
  "Merah Cabe": "#cc333d",

  Navy: "#1e3a8a",
  Black: "#0f172a",
  White: "#f8fafc",
  "Orange Safety": "#f97316",
  "Lime Safety": "#84cc16",
  Yellow: "#facc15",
  Khaki: "#c3b091",
  "Krem Khaki": "#d6c7a5",
  Krem: "#f2e5c4",
  "Dark Green": "#166534",
  "Royal Blue": "#1d4ed8",
  Maroon: "#7f1d1d",
  "Light Blue": "#7dd3fc",
  Pink: "#fbcfe8",
  Grey: "#94a3b8",
  "Dark Grey": "#475569",
  "Ceil Blue": "#7dd3fc",
  Teal: "#0d9488",
  Wine: "#9f1239",
  Charcoal: "#334155",
  Olive: "#4d7c0f",
  Burgundy: "#7f1d1d",
  Kuning: "#facc15",
  Merah: "#dc2626",
  Biru: "#2563eb",
  Hijau: "#16a34a",
  Putih: "#f8fafc",
  Hitam: "#0f172a",
  Abu: "#94a3b8",
  "Abu-abu": "#94a3b8",
  Cokelat: "#92400e",
  Coksu: "#b69a84",
  "Cokelat Susu": "#b69a84",
  "Coklat Susu": "#b69a84",
  "Cokelat Susu (Coksu)": "#b69a84",
  Milo: "#8b6b50",
  Bronze: "#a77949",
  Dove: "#a99b90",
  Mocca: "#8a7062",
  Mocha: "#8a7062",
  Terracotta: "#b76e51",
  Oranye: "#f97316",
  Ungu: "#7e22ce",
};

const COLOR_ALIASES: Array<[string[], string]> = [
  [["krem khaki", "cream khaki", "khaki cream", "khaki krem"], "#d6c7a5"],
  [["camel", "tan"], "#bc7f45"],
  [["navy", "biru dongker", "dongker"], "#1e3a8a"],
  [["black", "hitam"], "#0f172a"],
  [["white", "putih"], "#f8fafc"],
  [["yellow", "kuning"], "#facc15"],
  [["orange", "oranye"], "#f97316"],
  [["lime", "hijau stabilo"], "#84cc16"],
  [["dark green", "hijau tua"], "#166534"],
  [["green", "hijau"], "#16a34a"],
  [["royal blue", "biru royal"], "#1d4ed8"],
  [["light blue", "ceil blue", "biru muda"], "#7dd3fc"],
  [["blue", "biru"], "#2563eb"],
  [["maroon", "burgundy", "wine", "merah marun"], "#7f1d1d"],
  [["pink", "merah muda"], "#f9a8d4"],
  [["red", "merah"], "#dc2626"],
  [["dark grey", "dark gray", "abu tua"], "#475569"],
  [["grey", "gray", "abu-abu", "abu"], "#94a3b8"],
  [["khaki"], "#c3b091"],
  [["krem", "cream"], "#f2e5c4"],
  [["cokelat", "coklat", "brown"], "#92400e"],
  [["purple", "ungu"], "#7e22ce"],
  [["teal", "toska"], "#0d9488"],
  [["olive", "zaitun"], "#4d7c0f"],
];

const COMBINATION_SEPARATOR = /\s*(?:\/|\\|\+|&|,|–|—|-|\bdan\b|\band\b)\s*/i;
const UNKNOWN_COLOR = "#cbd5e1";

function normalized(value: string) {
  return value.trim().toLocaleLowerCase("id-ID");
}

function exactColor(colorName: string) {
  const target = normalized(colorName);
  return Object.entries(COLOR_SWATCHES).find(([name]) => normalized(name) === target)?.[1];
}

function resolveColor(colorName: string) {
  const exact = exactColor(colorName);
  if (exact) return exact;

  const target = normalized(colorName);
  return COLOR_ALIASES.find(([names]) => names.some((name) => target.includes(name)))?.[1];
}

function combinationParts(colorName: string) {
  if (exactColor(colorName)) return [colorName.trim()];
  const parts = colorName.split(COMBINATION_SEPARATOR).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2 || parts.some((part) => !resolveColor(part))) return [colorName.trim()];

  const distinctColors = new Set(parts.map((part) => resolveColor(part)));
  return distinctColors.size > 1 ? parts : [colorName.trim()];
}

function readableCase(value: string) {
  const trimmed = value.trim();
  if (trimmed !== trimmed.toLocaleUpperCase("id-ID")) return trimmed;
  return trimmed
    .toLocaleLowerCase("id-ID")
    .replace(/(^|\s)([a-z])/g, (_, prefix: string, letter: string) => `${prefix}${letter.toLocaleUpperCase("id-ID")}`);
}

export function productColorSwatch(colorName: string) {
  return resolveColor(colorName) ?? UNKNOWN_COLOR;
}

/** Neutral garment swatches; admins can override these for each variant. */
export function fabricColorForName(name: string) {
  const colors: Record<string, string> = {
    hitam: "#242424", black: "#242424", putih: "#ffffff", white: "#ffffff",
    "abu asap": "#a1aab6", "baby blue": "#a6c5df", army: "#535d44",
    navy: "#24354c", "abu tua": "#555963", maroon: "#712f3c",
  };
  return colors[normalized(name)] ?? productColorSwatch(name);
}

/** Saved sRGB takes precedence over approximate names, including migrated variants. */
export function productFabricColor(product: {
  colorValues?: Record<string, string>;
  productVariants?: { options: Record<string, string>; fabricColor?: string }[];
  colorVariants?: { color: string; fabricColor?: string }[];
}, name: string): string | undefined {
  const valid = (value?: string) => value && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : undefined;
  const saved = Object.entries(product.colorValues ?? {}).find(([key]) => normalized(key) === normalized(name))?.[1];
  if (valid(saved)) return valid(saved);
  const rows = product.productVariants?.filter(row => Object.entries(row.options).some(([key, value]) => /^(pa_)?(warna|color)$/i.test(key) && normalized(value) === normalized(name)));
  if (rows?.length) return rows.map(row => valid(row.fabricColor)).find(Boolean);
  return valid(product.colorVariants?.find(row => normalized(row.color) === normalized(name))?.fabricColor);
}

export function productColorPalette(colorName: string) {
  const parts = combinationParts(colorName);
  const colors = parts.map((part) => resolveColor(part) ?? UNKNOWN_COLOR);
  return [...new Set(colors)];
}

export function productColorSwatchStyle(colorName: string, product?: Parameters<typeof productFabricColor>[0]): CSSProperties {
  const colors = productColorPalette(colorName);
  const saved = product && productFabricColor(product, colorName);
  if (colors.length < 2 && saved) return { backgroundColor: saved };
  if (colors.length < 2) return { backgroundColor: colors[0] ?? UNKNOWN_COLOR };

  const stopSize = 100 / colors.length;
  const stops = colors.flatMap((color, index) => [
    `${color} ${(index * stopSize).toFixed(2)}%`,
    `${color} ${((index + 1) * stopSize).toFixed(2)}%`,
  ]);
  return {
    backgroundColor: colors[0],
    backgroundImage: `linear-gradient(135deg, ${stops.join(", ")})`,
  };
}

export function productColorDisplayLabel(colorName: string) {
  return combinationParts(colorName).map(readableCase).join("–");
}
