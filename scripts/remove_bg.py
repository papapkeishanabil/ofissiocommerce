"""
Remove background from a product photo. Uses rembg (AI U2Net) for clean
silhouettes on apparel; falls back to Pillow corner-sampling if rembg isn't
available or fails on a particular image.

Outputs:
  - <out_png>      : RGBA PNG, background transparent, edge-feathered.
  - <out_mask_png> : L-mode PNG, white = product, black = background.

Usage:
    python scripts/remove_bg.py <input> [<out_png>] [<out_mask_png>]
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


def remove_with_rembg(img: Image.Image) -> Image.Image | None:
    """Try rembg; return RGBA image or None on failure."""
    try:
        from rembg import remove as rembg_remove
        out = rembg_remove(img.convert("RGB"))
        if out is not None:
            return out.convert("RGBA")
    except Exception as e:
        print(f"  rembg fallback: {e}", file=sys.stderr)
    return None


def remove_with_pillow(arr: np.ndarray) -> np.ndarray:
    """Pillow fallback: corner-sampling + Manhattan distance thresholding."""
    bg = _sample_bg_color(arr)
    diff = np.abs(arr - bg).sum(axis=2)
    fg_mask = diff > 60
    fg_mask = _morph_close(fg_mask, iterations=2)
    return fg_mask


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python scripts/remove_bg.py <input> [<out_png>] [<out_mask_png>]")
        return 2
    inp = Path(sys.argv[1])
    if not inp.exists():
        print(f"Input not found: {inp}")
        return 1
    out_png = Path(sys.argv[2]) if len(sys.argv) > 2 else inp.with_name(f"{inp.stem}-nobg.png")
    out_mask = (
        Path(sys.argv[3]) if len(sys.argv) > 3 else inp.with_name(f"{inp.stem}-mask.png")
    )

    img = Image.open(inp).convert("RGB")
    print(f"Removing background for {inp.name} (rembg AI preferred)…")

    rgba = remove_with_rembg(img)
    if rgba is not None:
        # rembg gives us alpha — extract mask from alpha channel.
        alpha = np.asarray(rgba)[:, :, 3]
        # Feather edges for clean silhouette.
        alpha_pil = Image.fromarray(alpha, mode="L").filter(ImageFilter.GaussianBlur(radius=1.5))
        alpha = np.asarray(alpha_pil)
        # Rebuild rgba with smoothed alpha.
        rgba_arr = np.dstack([np.asarray(rgba)[:, :, :3], alpha])
        Image.fromarray(rgba_arr.astype(np.uint8), mode="RGBA").save(out_png)
        # Mask: threshold alpha at 128.
        mask = (alpha > 128).astype(np.uint8) * 255
        Image.fromarray(mask, mode="L").save(out_mask)
        print(f"  [rembg] {out_png.name} ({out_png.stat().st_size // 1024} KB), "
              f"mask ({out_mask.stat().st_size // 1024} KB)")
        return 0

    # Pillow fallback
    arr = np.asarray(img).astype(np.int16)
    fg_mask = remove_with_pillow(arr)
    alpha = _feather((fg_mask * 255).astype(np.uint8), edge_width=2)
    rgba = np.dstack([arr.astype(np.uint8), alpha])
    Image.fromarray(rgba, mode="RGBA").save(out_png)
    Image.fromarray(fg_mask.astype(np.uint8) * 255, mode="L").save(out_mask)
    print(f"  [pillow] {out_png.name} ({out_png.stat().st_size // 1024} KB), "
          f"mask ({out_mask.stat().st_size // 1024} KB)")
    return 0


def _sample_bg_color(arr: np.ndarray) -> np.ndarray:
    h, w = arr.shape[:2]
    samples = np.concatenate(
        [
            arr[0:8, 0:8].reshape(-1, arr.shape[2]),
            arr[0:8, -8:].reshape(-1, arr.shape[2]),
            arr[-8:, 0:8].reshape(-1, arr.shape[2]),
            arr[-8:, -8:].reshape(-1, arr.shape[2]),
            arr[0:4, :].reshape(-1, arr.shape[2]),
            arr[-4:, :].reshape(-1, arr.shape[2]),
            arr[:, 0:4].reshape(-1, arr.shape[2]),
            arr[:, -4:].reshape(-1, arr.shape[2]),
        ],
        axis=0,
    )
    return np.median(samples, axis=0)


def _morph_close(mask: np.ndarray, iterations: int = 1) -> np.ndarray:
    out = mask.copy()
    for _ in range(iterations):
        m = np.pad(out, 1, constant_values=False)
        out = m[1:-1, 1:-1] & m[2:, 1:-1] & m[:-2, 1:-1] & m[1:-1, 2:] & m[1:-1, :-2]
    for _ in range(iterations):
        m = np.pad(out, 1, constant_values=False)
        out = m[1:-1, 1:-1] | m[2:, 1:-1] | m[:-2, 1:-1] | m[1:-1, 2:] | m[1:-1, :-2]
    return out


def _feather(alpha: np.ndarray, edge_width: int = 2) -> np.ndarray:
    img = Image.fromarray(alpha, mode="L")
    return np.asarray(img.filter(ImageFilter.GaussianBlur(radius=edge_width))).astype(np.uint8)


if __name__ == "__main__":
    sys.exit(main())
