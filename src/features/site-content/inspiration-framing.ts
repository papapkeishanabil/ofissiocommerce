import type { IndustryInspirationData } from "./content.schema";

export type ImageFrame = { x: number; y: number; fit: "cover" | "contain" };
export type HomeFrameKind = "feature" | "card" | "corporate";
export const HOME_FRAME_RATIOS = { feature: 1 / 2, card: 3 / 4, corporate: 11 / 10 } as const;
export function homeImageFrame(data: IndustryInspirationData | undefined, kind: HomeFrameKind): ImageFrame {
  return data?.homepageFrames?.[kind] ?? { x: 50, y: 50, fit: "cover" };
}

/** Move the rendered photo, converting pixel travel into object-position %. */
export function draggedImagePosition(start: ImageFrame, dx: number, dy: number, width: number, height: number, naturalWidth: number, naturalHeight: number): ImageFrame {
  if (!width || !height || !naturalWidth || !naturalHeight) return start;
  const scale = (start.fit === "cover" ? Math.max : Math.min)(width / naturalWidth, height / naturalHeight);
  const freeX = width - naturalWidth * scale;
  const freeY = height - naturalHeight * scale;
  const move = (position: number, delta: number, free: number) => Math.abs(free) < 0.5 ? position : Math.round(Math.max(0, Math.min(100, position + delta / free * 100)) * 10) / 10;
  return { ...start, x: move(start.x, dx, freeX), y: move(start.y, dy, freeY) };
}
