import "server-only";

import { readFileSync, statSync } from "node:fs";
import { basename, extname, relative, resolve, sep } from "node:path";

const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

export interface SafePublicProductImage {
  absolutePath: string;
  publicPath: string;
  filename: string;
  extension: "png" | "jpg" | "jpeg" | "webp";
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  data: Buffer;
}

/**
 * Resolve only real image files below public/products. The containment check
 * happens after path normalization, so ../, backslashes and absolute paths
 * cannot escape the approved directory.
 */
export function readSafePublicProductImage(input: string): SafePublicProductImage {
  const value = input.trim();
  if (!value || value.includes("\0") || value.includes("\\")) {
    throw new Error("Invalid public product image path.");
  }

  const productsRoot = resolve(process.cwd(), "public", "products");
  const requested = value.replace(/^\/+/, "");
  if (!requested.toLowerCase().startsWith("products/")) {
    throw new Error("Image must be located below /products.");
  }

  const absolutePath = resolve(process.cwd(), "public", requested);
  const pathFromRoot = relative(productsRoot, absolutePath);
  if (
    !pathFromRoot ||
    pathFromRoot === ".." ||
    pathFromRoot.startsWith(`..${sep}`) ||
    resolve(productsRoot, pathFromRoot) !== absolutePath
  ) {
    throw new Error("Image path escapes the approved products directory.");
  }

  const extension = extname(absolutePath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error("Unsupported product image extension.");
  }
  const stat = statSync(absolutePath);
  if (!stat.isFile() || stat.size <= 0 || stat.size > 15 * 1024 * 1024) {
    throw new Error("Product image must be a file up to 15 MB.");
  }

  const data = readFileSync(absolutePath);
  const detected = detectImageType(data);
  const normalizedExtension = extension.slice(1) as SafePublicProductImage["extension"];
  if (
    detected.extension !== normalizedExtension &&
    !(detected.extension === "jpg" && normalizedExtension === "jpeg")
  ) {
    throw new Error("Product image content does not match its extension.");
  }

  return {
    absolutePath,
    publicPath: `/${requested.replace(/\\/g, "/")}`,
    filename: basename(absolutePath),
    extension: normalizedExtension,
    mimeType: detected.mimeType,
    data,
  };
}

function detectImageType(data: Buffer): {
  extension: "png" | "jpg" | "webp";
  mimeType: "image/png" | "image/jpeg" | "image/webp";
} {
  if (
    data.length >= 8 &&
    data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { extension: "png", mimeType: "image/png" };
  }
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return { extension: "jpg", mimeType: "image/jpeg" };
  }
  if (
    data.length >= 12 &&
    data.subarray(0, 4).toString("ascii") === "RIFF" &&
    data.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { extension: "webp", mimeType: "image/webp" };
  }
  throw new Error("File is not a supported image.");
}

