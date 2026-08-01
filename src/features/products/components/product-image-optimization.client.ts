const MAX_PRODUCT_IMAGE_DIMENSION = 2_400;
const PRODUCT_IMAGE_WEBP_QUALITY = 0.9;
const MIN_SAVINGS_RATIO = 0.92;

export interface ProductImageOptimizationResult {
  file: File;
  optimized: boolean;
  originalBytes: number;
  uploadBytes: number;
}

export async function optimizeProductImage(
  sourceFile: File,
): Promise<ProductImageOptimizationResult> {
  const originalBytes = sourceFile.size;
  let bitmap: ImageBitmap | null = null;

  try {
    bitmap = await createImageBitmap(sourceFile, {
      imageOrientation: "from-image",
    });
    const scale = Math.min(
      1,
      MAX_PRODUCT_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return unchanged(sourceFile);

    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await canvasToBlob(
      canvas,
      "image/webp",
      PRODUCT_IMAGE_WEBP_QUALITY,
    );
    if (!blob) return unchanged(sourceFile);

    const resized = scale < 1;
    const meaningfullySmaller = blob.size < sourceFile.size * MIN_SAVINGS_RATIO;
    if (!resized && !meaningfullySmaller) return unchanged(sourceFile);

    const optimizedFile = new File(
      [blob],
      `${filenameWithoutExtension(sourceFile.name)}.webp`,
      {
        type: "image/webp",
        lastModified: sourceFile.lastModified,
      },
    );
    return {
      file: optimizedFile,
      optimized: true,
      originalBytes,
      uploadBytes: optimizedFile.size,
    };
  } catch {
    return unchanged(sourceFile);
  } finally {
    bitmap?.close();
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mimeType, quality);
  });
}

function filenameWithoutExtension(filename: string) {
  const base = filename.replace(/\.[^.]+$/, "").trim();
  return base || "product-image";
}

function unchanged(file: File): ProductImageOptimizationResult {
  return {
    file,
    optimized: false,
    originalBytes: file.size,
    uploadBytes: file.size,
  };
}
