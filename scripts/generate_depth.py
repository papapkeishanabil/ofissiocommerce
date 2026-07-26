"""
Pre-process depth maps for product photos using Depth Anything (Small).

Usage:
    python scripts/generate_depth.py <input_image> [<output_depth_image>]

Downloads the model on first run (~100MB), then for each input writes a
grayscale 16-bit PNG where brighter = closer to camera. This depth image is
consumed by the browser-side Depth3DViewer to displace a 3D mesh.
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python scripts/generate_depth.py <input_image> [<output>]")
        return 2

    input_path = Path(sys.argv[1])
    if not input_path.exists():
        print(f"Input not found: {input_path}")
        return 1

    output_path = Path(sys.argv[2]) if len(sys.argv) > 2 else input_path.with_name(
        f"{input_path.stem}-depth.png"
    )

    # Lazy import so the script's --help is fast.
    import torch
    from transformers import pipeline as hf_pipeline

    print(f"Loading Depth Anything Small (first run downloads ~100MB)…")
    pipe = hf_pipeline(
        task="depth-estimation",
        model="depth-anything/Depth-Anything-V2-Small-hf",
        device="cuda" if torch.cuda.is_available() else "cpu",
    )

    print(f"Estimating depth for {input_path.name}…")
    image = Image.open(input_path).convert("RGB")
    result = pipe(image)
    depth = np.array(result["depth"])  # uint8 0..255

    # Normalize to full 0..255 range for maximum mesh displacement resolution.
    dmin, dmax = depth.min(), depth.max()
    if dmax > dmin:
        depth = ((depth - dmin) * 255.0 / (dmax - dmin)).astype(np.uint8)

    # Save as 8-bit grayscale PNG (compact, ~100-300 KB).
    Image.fromarray(depth, mode="L").save(output_path, optimize=True)
    print(f"Wrote depth map: {output_path} ({output_path.stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
