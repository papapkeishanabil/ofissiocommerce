import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";

import { getWordPressMediaRuntimeConfig } from "@/features/products/woocommerce/wordpress-media-upload.service";
import {
  fromSameOriginWordPressMediaUrl,
  WORDPRESS_MEDIA_PATH_PREFIX,
} from "@/features/products/woocommerce/wordpress-media-proxy";
import { createApiError } from "@/lib/security/safe-error-response";
import { getOptionalServerEnv } from "@/lib/security/server-only-secret";
import { SecurityApiError } from "@/lib/security/security.types";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const DEFAULT_VISION_MODEL = "gemini-2.5-flash";

const placementSchema = z.object({
  id: z.string().trim().min(1).max(40),
  anchorX: z.number().min(2).max(98),
  anchorY: z.number().min(2).max(98),
  labelX: z.number().min(2).max(98),
  labelY: z.number().min(2).max(98),
});

const analysisSchema = z.object({
  focalX: z.number().min(0).max(100),
  focalY: z.number().min(0).max(100),
  placements: z.array(placementSchema).min(1).max(8),
});

export interface InspirationAnalysisInput {
  image: string;
  title: string;
  annotations: { id: string; title: string }[];
}

export async function analyzeIndustryInspirationImage(input: InspirationAnalysisInput) {
  const apiKey = getOptionalServerEnv("GEMINI_API_KEY");
  if (!apiKey) {
    throw createApiError(
      "PROVIDER_UNAVAILABLE",
      "Gemini belum dikonfigurasi. Isi GEMINI_API_KEY untuk memakai deteksi otomatis.",
      503,
    );
  }

  const image = await loadTrustedImage(input.image);
  const modelName = getOptionalServerEnv(
    "GEMINI_VISION_MODEL",
    getOptionalServerEnv("GEMINI_MODEL", DEFAULT_VISION_MODEL),
  );
  const provider = createGoogleGenerativeAI({ apiKey });
  const annotationList = input.annotations
    .map((annotation) => `- ${annotation.id}: ${annotation.title}`)
    .join("\n");

  try {
    const result = await generateText({
      model: provider(modelName),
      temperature: 0.1,
      output: Output.object({ schema: analysisSchema }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "Analyze this marketing photograph for an interactive uniform-benefit annotation layout.",
                "Coordinates must be percentages of the ORIGINAL image: x=0 left, x=100 right, y=0 top, y=100 bottom.",
                "For every requested annotation, place anchorX/anchorY on a clearly visible part of the worn uniform—not on skin, a vehicle, machinery, furniture, or background.",
                "Choose a semantically sensible garment region: cooling/sweat near torso or underarm, mobility near shoulder/elbow/knee, durability near pocket/knee, identity near chest/logo or the complete uniform silhouette.",
                "Place labelX/labelY in nearby negative space outside the person. Keep it 8-24 percentage points from the anchor, avoid covering the face or the garment, and alternate sides when useful.",
                "The public headline occupies roughly x=2-32 and y=12-55, so avoid labels there when possible.",
                "Set focalX/focalY as CSS object-position percentages that keep the complete uniformed subject visible during cover cropping: use a low focalX when the subject is left, high focalX when right, and 50 when centered.",
                `Page title: ${input.title}`,
                "Requested annotations:",
                annotationList,
                "Return every requested id exactly once. Do not invent product specifications or new marketing claims.",
              ].join("\n"),
            },
            {
              type: "file",
              mediaType: image.mediaType,
              data: image.bytes,
              filename: image.filename,
            },
          ],
        },
      ],
    });
    const output = result.output;
    if (!output) {
      throw createApiError("PROVIDER_UNAVAILABLE", "Gemini tidak mengembalikan posisi anotasi.", 502);
    }

    const expectedIds = new Set(input.annotations.map((annotation) => annotation.id));
    const unique = new Map(
      output.placements
        .filter((placement) => expectedIds.has(placement.id))
        .map((placement) => [placement.id, placement]),
    );
    if (unique.size !== expectedIds.size) {
      throw createApiError(
        "PROVIDER_UNAVAILABLE",
        "Hasil AI belum lengkap. Jalankan deteksi ulang atau atur titik secara manual.",
        502,
      );
    }

    return {
      focalX: output.focalX,
      focalY: output.focalY,
      placements: input.annotations.map((annotation) => unique.get(annotation.id)!),
      model: modelName,
    };
  } catch (error) {
    if (error instanceof SecurityApiError) throw error;
    if (error instanceof NoObjectGeneratedError) {
      throw createApiError(
        "PROVIDER_UNAVAILABLE",
        "AI belum menghasilkan koordinat yang valid. Coba gambar lain atau atur manual.",
        502,
      );
    }
    throw createApiError(
      "PROVIDER_UNAVAILABLE",
      "Layanan analisis gambar sedang tidak tersedia. Posisi pin tetap dapat diatur manual.",
      503,
    );
  }
}

async function loadTrustedImage(value: string) {
  const source = value.trim();
  if (!source) throw createApiError("VALIDATION_ERROR", "URL gambar kosong.", 400);

  if (source.startsWith("/") && !source.startsWith("/api/media/wordpress/")) {
    const pathname = decodeURIComponent(source.split(/[?#]/, 1)[0] ?? "");
    const publicRoot = path.resolve(process.cwd(), "public");
    const absolute = path.resolve(publicRoot, `.${pathname}`);
    if (absolute !== publicRoot && !absolute.startsWith(`${publicRoot}${path.sep}`)) {
      throw createApiError("VALIDATION_ERROR", "Path gambar tidak valid.", 400);
    }
    const bytes = await readFile(absolute).catch(() => null);
    if (!bytes || bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) {
      throw createApiError("VALIDATION_ERROR", "Gambar lokal tidak ditemukan atau terlalu besar.", 400);
    }
    return {
      bytes,
      mediaType: mediaTypeForPath(pathname),
      filename: path.basename(pathname),
    };
  }

  const mediaConfig = getWordPressMediaRuntimeConfig();
  const restored = fromSameOriginWordPressMediaUrl(source, mediaConfig.baseUrl);
  let target: URL;
  let allowedOrigin: URL;
  try {
    target = new URL(restored);
    allowedOrigin = new URL(mediaConfig.baseUrl);
  } catch {
    throw createApiError("VALIDATION_ERROR", "URL gambar tidak valid.", 400);
  }
  if (
    !mediaConfig.baseUrl ||
    target.origin !== allowedOrigin.origin ||
    !target.pathname.startsWith(WORDPRESS_MEDIA_PATH_PREFIX)
  ) {
    throw createApiError(
      "VALIDATION_ERROR",
      "Deteksi AI hanya menerima gambar lokal atau gambar hasil upload Admin Ofissio.",
      400,
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(target, {
      headers: { Accept: "image/jpeg,image/png,image/webp" },
      redirect: "error",
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      throw createApiError("PROVIDER_UNAVAILABLE", "Gambar upload belum dapat dibaca kembali.", 503);
    }
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_IMAGE_BYTES) {
      throw createApiError("VALIDATION_ERROR", "Ukuran gambar melebihi 12 MB.", 400);
    }
    const mediaType = response.headers.get("content-type")?.split(";", 1)[0]?.trim() ?? "";
    if (!ALLOWED_IMAGE_TYPES.has(mediaType)) {
      throw createApiError("VALIDATION_ERROR", "Format gambar tidak didukung AI.", 400);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.byteLength || bytes.byteLength > MAX_IMAGE_BYTES) {
      throw createApiError("VALIDATION_ERROR", "Gambar kosong atau terlalu besar.", 400);
    }
    return { bytes, mediaType, filename: path.basename(target.pathname) };
  } finally {
    clearTimeout(timeout);
  }
}

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function mediaTypeForPath(value: string) {
  const extension = path.extname(value).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  throw createApiError("VALIDATION_ERROR", "Format gambar lokal tidak didukung AI.", 400);
}
