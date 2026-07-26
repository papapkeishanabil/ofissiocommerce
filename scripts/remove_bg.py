"""
Remove background from a product photo using simple corner-sampling flood
thresholding with Pillow + numpy. Works well for product photos with a
reasonably uniform background (the KK-006 photos are grey/white seamless).

Outputs a PNG with transparent background, plus a separate alpha mask PNG
that the Depth3DViewer uses to discard background pixels from the displaced
mesh (so only the garment surfaces render, not a "wall" around the product).

Usage:
    python scripts/remove_bg.py <input_image> [<output_png> [<output_mask_png>]]
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image


def sample_bg_color(arr: np.ndarray) -> np.ndarray:
    """Sample the 4 corners + edges to estimate background color."""
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
    # median is more robust than mean to a few stray foreground pixels at edges
    return np.median(samples, axis=0)


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
        Path(sys.argv[3])
        if len(sys.argv) > 3
        else inp.with_name(f"{inp.stem}-mask.png")
    )

    img = Image.open(inp).convert("RGB")
    arr = np.asarray(img).astype(np.int16)

    bg = sample_bg_color(arr)  # (3,)
    diff = np.abs(arr - bg).sum(axis=2)  # Manhattan distance per pixel
    # Foreground = differs from background by more than threshold.
    # Use Otsu-like split: threshold = midpoint between background diff median
    # and the long tail. A fixed 60 works for typical seamless studio shots.
    threshold = 60
    fg_mask = diff > threshold  # bool HxW

    # Cleanup: erode then dilate to drop speckle, fill small holes.
    fg_mask = _morph_close(fg_mask, iterations=2)

    # Build alpha channel (0 or 255) with edge feathering for clean silhouette.
    alpha = (fg_mask * 255).astype(np.uint8)
    alpha = _feather(alpha, edge_width=2)

    rgba = np.dstack([arr.astype(np.uint8), alpha])
    Image.fromarray(rgba, mode="RGBA").save(out_png)
    # Mask PNG (white = keep, black = discard) for the viewer
    Image.fromarray(fg_mask.astype(np.uint8) * 255, mode="L").save(out_mask)

    print(
        f"Wrote no-bg: {out_png} ({out_png.stat().st_size // 1024} KB), "
        f"mask: {out_mask} ({out_mask.stat().st_size // 1024} KB)"
    )
    return 0


def _morph_close(mask: np.ndarray, iterations: int = 1) -> np.ndarray:
    """Crude erode-then-dilate to remove speckle and fill small holes."""
    out = mask.copy()
    for _ in range(iterations):
        # erode (and of neighbours) — drops speckle
        m = np.pad(out, 1, constant_values=False)
        out = (
            m[1:-1, 1:-1]
            & m[2:, 1:-1]
            & m[:-2, 1:-1]
            & m[1:-1, 2:]
            & m[1:-1, :-2]
        )
    for _ in range(iterations):
        # dilate (or of neighbours) — refills holes & restores edges
        m = np.pad(out, 1, constant_values=False)
        out = (
            m[1:-1, 1:-1]
            | m[2:, 1:-1]
            | m[:-2, 1:-1]
            | m[1:-1, 2:]
            | m[1:-1, :-2]
        )
    return out


def _feather(alpha: np.ndarray, edge_width: int = 2) -> np.ndarray:
    """Smooth alpha at the foreground/background boundary to avoid jaggies."""
    from PIL import Image as PILImage, ImageFilter

    img = PILImage.fromarray(alpha, mode="L")
    return np.asarray(img.filter(ImageFilter.GaussianBlur(radius=edge_width))).astype(np.uint8)


if __name__ == "__main__":
    sys.exit(main())
