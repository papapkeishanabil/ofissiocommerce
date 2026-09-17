# Back embroidery zone icons

Generated using the built-in imagegen tool for the existing Ofissio Studio icon set.

- `zone-upper-back.png`: Punggung Atas, marker near the nape.
- `zone-center-back-v2.png`: Punggung Tengah, marker immediately below the horizontal back yoke seam. The earlier `zone-center-back.png` is retained as a superseded asset.

Both files are generated from the same back-view shirt reference and use a white background matching the selector cards.

## Final prompts

### Punggung Atas

Precise object edit. Image 1 is the edit target: a navy outline back-view long-sleeve shirt UI icon with a single ochre dashed upper-back marker. Remove EVERY checkerboard pattern and background texture, replacing with pure solid white #ffffff everywhere inside and outside the shirt outline. Keep every navy outline, garment shape, framing, stroke width, and ochre marker placement EXACTLY unchanged. Flat vector-like icon, no shading, no new elements, no transparency or checkerboard. White canvas square.

### Punggung Tengah

Precise object edit. Image 1 is the edit target: a navy outline back-view long-sleeve shirt UI icon with a single ochre dashed marker. Make ONLY two changes: (1) remove EVERY checkerboard pattern or texture replacing with pure solid white #ffffff everywhere inside and outside the shirt outline; (2) move the single ochre dashed rectangle from near the neck to the center of the back, centered horizontally at approximately 50% image height. Make rectangle a bit larger (about 18% image width by 13% image height). Remove the old upper marker entirely. Preserve EXACTLY the navy garment outlines, framing, long sleeves, cuffs, collar, shoulder yoke, line weight and color of Image 1. Flat vector-like back-view icon, white canvas, no text, no shading, no extra elements, no transparency or checkerboard.

### Punggung Tengah correction (2026-09-09)

Precise-object-edit for Ofissio Studio Bordir icon. Image 1 is the edit target. Change ONLY the vertical position of the ochre dashed rectangular embroidery marker: move it upward from the mid-torso so its top edge is just below the navy horizontal shoulder-yoke seam, with a small clean gap. On this 1254x1254 image the seam is at y=330; place the marker top at approximately y=375, bottom at y=510, keeping it horizontally centered and its existing width unchanged. Erase the old lower marker completely. Preserve EXACTLY every navy shirt outline, the neck/collar, shoulder seam, sleeves, cuffs, bottom hem, palette, stroke weight, canvas size and pure white background. No additional markers, text, shadows or patterns. The result must clearly indicate embroidery directly under the horizontal back seam.

## Verification

Browser captures and interaction checks: `.impeccable/audit/studio-back-zones-2026-09-09/`.
Pricing uses existing Admin zone IDs `upper_back` and `center_back`; the viewer's `middle_back` ID is normalized by the existing pricing helper.
