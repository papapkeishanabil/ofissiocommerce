import "server-only";

import { createHash } from "node:crypto";
import { getWordPressMediaRuntimeConfig } from "@/features/products/woocommerce/wordpress-media-upload.service";
import { withWordPressProviderSlot } from "@/features/products/woocommerce/wordpress-provider-gate";
import { PRODUCT_IMPORT_LIMITS } from "./product-import.config";

export type LegacyImageFailureStage = "PLAN_VALIDATION" | "SOURCE_DOWNLOAD" | "SOURCE_VALIDATE";

export class LegacyImageSourceError extends Error {
  constructor(
    public readonly failureStage: LegacyImageFailureStage,
    public readonly errorCode: string,
    public readonly safeMessage: string,
    options?: { cause?: unknown },
  ) {
    super(safeMessage, options);
    this.name = "LegacyImageSourceError";
  }
}

export interface LegacyImageInspection {
  bytes: Uint8Array;
  mimeType: string;
  detectedExtension: string;
  filename: string;
  sha256: string;
  httpStatus: number;
  finalStatus: number;
  redirectStatuses: number[];
  contentType: string;
  byteCount: number;
  finalUrl: string;
}

interface LegacyImageDependencies {
  fetcher?: typeof fetch;
  onStage?: (stage: LegacyImageFailureStage) => void;
}

const DEFAULT_LEGACY_SOURCE_HOSTS = ["www.ofissio.com", "ofissio.com"];
const MAX_REDIRECTS = 3;

export async function inspectTrustedLegacyImage(
  source: string,
  dependencies: LegacyImageDependencies = {},
): Promise<LegacyImageInspection> {
  dependencies.onStage?.("PLAN_VALIDATION");
  const initialUrl = parseAndValidateSourceUrl(source);
  dependencies.onStage?.("SOURCE_DOWNLOAD");
  const downloaded = await downloadWithTrustedRedirects(initialUrl, dependencies.fetcher ?? fetch);
  dependencies.onStage?.("SOURCE_VALIDATE");
  return validateDownloadedLegacyImage(downloaded);
}

export async function downloadTrustedLegacyImage(source: string) {
  const inspected = await inspectTrustedLegacyImage(source);
  return { bytes: inspected.bytes, mimeType: inspected.mimeType, filename: inspected.filename };
}

function parseAndValidateSourceUrl(source: string) {
  let url: URL;
  try {
    url = new URL(source);
  } catch (cause) {
    throw new LegacyImageSourceError("PLAN_VALIDATION", "INVALID_SOURCE_URL", "Legacy image URL tidak valid.", { cause });
  }
  assertTrustedSourceUrl(url);
  return url;
}

function assertTrustedSourceUrl(url: URL) {
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    !legacySourceHosts().has(url.hostname.toLowerCase())
  ) {
    throw new LegacyImageSourceError("PLAN_VALIDATION", "SOURCE_HOST_NOT_ALLOWED", "Host sumber legacy image tidak termasuk allowlist.");
  }
}

function legacySourceHosts() {
  const configuredTarget = new URL(getWordPressMediaRuntimeConfig().baseUrl).hostname.toLowerCase();
  const configuredSources = (process.env.PRODUCT_IMPORT_LEGACY_IMAGE_HOSTS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  return new Set([configuredTarget, ...DEFAULT_LEGACY_SOURCE_HOSTS, ...configuredSources]);
}

async function downloadWithTrustedRedirects(initialUrl: URL, fetcher: typeof fetch) {
  return withWordPressProviderSlot("GET legacy product image", async () => {
    let currentUrl = initialUrl;
    const redirectStatuses: number[] = [];
    let initialStatus = 0;
    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      let response: Response;
      try {
        response = await fetcher(currentUrl, { redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(30_000), headers: { Accept: "image/jpeg,image/png,image/webp" } });
      } catch (cause) {
        throw new LegacyImageSourceError("SOURCE_DOWNLOAD", "SOURCE_DOWNLOAD_FAILED", "Legacy image gagal diunduh.", { cause });
      }
      if (!initialStatus) initialStatus = response.status;
      if (response.status >= 300 && response.status < 400) {
        redirectStatuses.push(response.status);
        const location = response.headers.get("location");
        await response.body?.cancel().catch(() => undefined);
        if (!location || redirectCount === MAX_REDIRECTS) throw new LegacyImageSourceError("SOURCE_DOWNLOAD", "SOURCE_REDIRECT_INVALID", "Redirect legacy image tidak valid.");
        const redirectedUrl = new URL(location, currentUrl);
        assertTrustedSourceUrl(redirectedUrl);
        currentUrl = redirectedUrl;
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        throw new LegacyImageSourceError("SOURCE_DOWNLOAD", `SOURCE_HTTP_${response.status}`, "Legacy image gagal diunduh.");
      }
      const advertised = Number(response.headers.get("content-length") || 0);
      if (advertised > PRODUCT_IMPORT_LIMITS.maxImageBytes) {
        await response.body?.cancel().catch(() => undefined);
        throw new LegacyImageSourceError("SOURCE_VALIDATE", "SOURCE_IMAGE_TOO_LARGE", "Legacy image terlalu besar.");
      }
      let bytes: Uint8Array;
      try {
        bytes = new Uint8Array(await response.arrayBuffer());
      } catch (cause) {
        throw new LegacyImageSourceError("SOURCE_DOWNLOAD", "SOURCE_BODY_READ_FAILED", "Body legacy image gagal dibaca.", { cause });
      }
      return { bytes, contentType: ((response.headers.get("content-type") ?? "").split(";")[0] ?? "").trim().toLowerCase(), initialStatus, finalStatus: response.status, redirectStatuses, finalUrl: currentUrl };
    }
    throw new LegacyImageSourceError("SOURCE_DOWNLOAD", "SOURCE_REDIRECT_INVALID", "Redirect legacy image tidak valid.");
  });
}

function validateDownloadedLegacyImage(downloaded: Awaited<ReturnType<typeof downloadWithTrustedRedirects>>): LegacyImageInspection {
  if (!downloaded.bytes.length) throw new LegacyImageSourceError("SOURCE_VALIDATE", "SOURCE_IMAGE_EMPTY", "Legacy image kosong.");
  if (downloaded.bytes.length > PRODUCT_IMPORT_LIMITS.maxImageBytes) throw new LegacyImageSourceError("SOURCE_VALIDATE", "SOURCE_IMAGE_TOO_LARGE", "Legacy image terlalu besar.");
  const declaredMime = normalizeSupportedMime(downloaded.contentType);
  if (!declaredMime) throw new LegacyImageSourceError("SOURCE_VALIDATE", "INVALID_IMAGE_CONTENT_TYPE", "Content-Type legacy image tidak didukung.");
  const detectedMime = sniffImage(downloaded.bytes);
  if (!detectedMime) throw new LegacyImageSourceError("SOURCE_VALIDATE", "INVALID_IMAGE_SIGNATURE", "Isi legacy image bukan gambar yang didukung.");
  if (detectedMime !== declaredMime) throw new LegacyImageSourceError("SOURCE_VALIDATE", "IMAGE_MIME_MISMATCH", "Content-Type dan isi legacy image tidak cocok.");
  const detectedExtension = extensionFor(detectedMime);
  const sourceFilename = decodeURIComponent(downloaded.finalUrl.pathname.split("/").at(-1) || `legacy.${detectedExtension}`);
  const filename = normalizeFilenameExtension(sourceFilename, detectedExtension);
  return { bytes: downloaded.bytes, mimeType: detectedMime, detectedExtension, filename, sha256: createHash("sha256").update(downloaded.bytes).digest("hex"), httpStatus: downloaded.initialStatus, finalStatus: downloaded.finalStatus, redirectStatuses: downloaded.redirectStatuses, contentType: downloaded.contentType, byteCount: downloaded.bytes.length, finalUrl: downloaded.finalUrl.toString() };
}

function normalizeSupportedMime(value: string) { if (value === "image/jpg") return "image/jpeg"; return value === "image/jpeg" || value === "image/png" || value === "image/webp" ? value : null; }
function sniffImage(bytes: Uint8Array) { if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg"; if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index]! === value)) return "image/png"; if (bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP") return "image/webp"; return null; }
function extensionFor(mime: string) { return mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg"; }
function normalizeFilenameExtension(value: string, extension: string) { const safe = value.replace(/[^a-z0-9._-]+/gi, "-").replace(/\.[a-z0-9]+$/i, "").slice(0, 160) || "legacy"; return `${safe}.${extension}`; }
