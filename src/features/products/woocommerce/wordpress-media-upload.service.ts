import "server-only";

import { Buffer } from "node:buffer";

import { getCommerceRuntimeConfig } from "@/features/commerce/commerce.config";
import { logInternalError } from "@/lib/security/safe-error-response";
import {
  assertNoPublicSecretEnv,
  getOptionalServerEnv,
} from "@/lib/security/server-only-secret";

import {
  allowSelfSignedTlsForWooUrl,
  requestWooCommerceJson,
} from "./woocommerce-http";
import { normalizeWooCommerceMediaUrl } from "./woocommerce-media-url";
import { toSameOriginWordPressMediaUrl } from "./wordpress-media-proxy";

const DEFAULT_PRODUCT_IMAGE_MAX_MB = 10;
// WordPress generates attachment metadata and several thumbnails before the
// media endpoint responds. Large PNG files can legitimately take longer than
// the normal WooCommerce JSON request timeout.
const WORDPRESS_MEDIA_UPLOAD_TIMEOUT_MS = 120_000;

interface WordPressMediaResponse {
  id?: unknown;
  slug?: unknown;
  mime_type?: unknown;
  source_url?: unknown;
  media_details?: { file?: unknown; width?: unknown; height?: unknown };
  alt_text?: unknown;
  title?: { rendered?: unknown };
}

export interface WordPressMediaUploadResult {
  id: number;
  /** Same-origin/browser-safe URL; never use this as permanent identity. */
  sourceUrl: string;
  /** Canonical target WordPress URL returned by the provider. */
  targetMediaUrl?: string;
  filename?: string;
  mimeType?: string;
  extension?: string;
  slug?: string;
  alt: string;
  title: string;
}

export async function findWordPressMediaBySearch(search: string): Promise<WordPressMediaUploadResult[]> {
  const config = getWordPressMediaRuntimeConfig();
  if (!config.isConfigured || !search.trim()) return [];
  const url = new URL(`${config.baseUrl}/wp-json/wp/v2/media`);
  url.searchParams.set("search", search.trim().slice(0, 100));
  url.searchParams.set("per_page", "20");
  url.searchParams.set("context", "edit");
  const response = await requestWordPressMediaRead<WordPressMediaResponse[]>(url, {
    headers: { Authorization: authorizationHeader(config), Accept: "application/json" },
    allowSelfSignedTls: allowSelfSignedTlsForWooUrl(url),
  });
  if (!response.ok || !Array.isArray(response.data)) return [];
  return response.data.flatMap((item) => {
    try { return [normalizeMediaResponse(item, config.baseUrl)]; } catch { return []; }
  });
}

export async function getWordPressMediaById(mediaId: number): Promise<WordPressMediaUploadResult> {
  const config = getWordPressMediaRuntimeConfig();
  if (!config.isConfigured || !Number.isInteger(mediaId) || mediaId <= 0) {
    throw new Error("wordpress_media_not_configured");
  }
  const url = new URL(
    `${config.baseUrl}/wp-json/wp/v2/media/${encodeURIComponent(String(mediaId))}`,
  );
  url.searchParams.set("context", "edit");
  const response = await requestWordPressMediaRead<WordPressMediaResponse>(url, {
    headers: { Authorization: authorizationHeader(config), Accept: "application/json" },
    allowSelfSignedTls: allowSelfSignedTlsForWooUrl(url),
  });
  if (!response.ok) throw new Error(`wordpress_media_readback_${classifyStatus(response.status)}`);
  return normalizeMediaResponse(response.data, config.baseUrl);
}

export function getWordPressMediaRuntimeConfig() {
  assertNoPublicSecretEnv([
    "NEXT_PUBLIC_WORDPRESS_MEDIA_USERNAME",
    "NEXT_PUBLIC_WORDPRESS_MEDIA_APP_PASSWORD",
    "NEXT_PUBLIC_WORDPRESS_MEDIA_TOKEN",
  ]);

  const commerce = getCommerceRuntimeConfig();
  const baseUrl = normalizeWordPressBaseUrl(
    getOptionalServerEnv("WORDPRESS_MEDIA_BASE_URL") ||
      commerce.woocommerce.baseUrl,
  );
  const username = getOptionalServerEnv("WORDPRESS_MEDIA_USERNAME");
  const appPassword = getOptionalServerEnv("WORDPRESS_MEDIA_APP_PASSWORD");
  const token = getOptionalServerEnv("WORDPRESS_MEDIA_TOKEN");
  const maxUploadMb = positiveNumber(
    getOptionalServerEnv("PRODUCT_IMAGE_MAX_MB"),
    DEFAULT_PRODUCT_IMAGE_MAX_MB,
  );

  return {
    baseUrl,
    username,
    appPassword,
    token,
    maxUploadMb,
    authMode: token ? "bearer" : username && appPassword ? "application_password" : "none",
    isConfigured: Boolean(baseUrl && (token || (username && appPassword))),
  } as const;
}

export async function uploadProductImageToWordPress(input: {
  file: File;
  filename: string;
  mimeType: string;
  title: string;
  alt: string;
}): Promise<WordPressMediaUploadResult> {
  const config = getWordPressMediaRuntimeConfig();
  if (!config.isConfigured) {
    throw new Error("wordpress_media_not_configured");
  }

  const url = new URL(`${config.baseUrl}/wp-json/wp/v2/media`);
  try {
    const response = await requestWooCommerceJson<WordPressMediaResponse>(url, {
      method: "POST",
      headers: {
        Authorization: authorizationHeader(config),
        Accept: "application/json",
        "Content-Type": input.mimeType,
        "Content-Disposition": `attachment; filename="${escapeHeaderFilename(input.filename)}"`,
      },
      body: input.file.stream(),
      bodyLength: input.file.size,
      allowSelfSignedTls: allowSelfSignedTlsForWooUrl(url),
      timeoutMs: WORDPRESS_MEDIA_UPLOAD_TIMEOUT_MS,
    });
    if (!response.ok) {
      throw new Error(`wordpress_media_upload_${classifyStatus(response.status)}`);
    }

    const uploaded = normalizeMediaResponse(response.data, config.baseUrl);
    await updateWordPressMediaMetadata({
      mediaId: uploaded.id,
      title: input.title,
      alt: input.alt,
    });
    return {
      ...uploaded,
      title: input.title || uploaded.title,
      alt: input.alt || uploaded.alt,
    };
  } catch (error) {
    logInternalError(error, {
      area: "wordpress_media",
      action: "upload_failed",
      mimeType: input.mimeType,
      sizeBytes: input.file.size,
    });
    if (error instanceof Error && error.message === "network_error") {
      throw new Error("wordpress_media_timeout");
    }
    throw error;
  }
}

export async function checkWordPressMediaAccess() {
  const config = getWordPressMediaRuntimeConfig();
  if (!config.isConfigured) {
    return { configured: false, reachable: false, authMode: config.authMode } as const;
  }
  const url = new URL(`${config.baseUrl}/wp-json/wp/v2/media`);
  url.searchParams.set("per_page", "1");
  url.searchParams.set("context", "edit");
  try {
    const response = await requestWordPressMediaRead<unknown[]>(url, {
      headers: {
        Authorization: authorizationHeader(config),
        Accept: "application/json",
      },
      allowSelfSignedTls: allowSelfSignedTlsForWooUrl(url),
    });
    return {
      configured: true,
      reachable: response.ok && Array.isArray(response.data),
      authMode: config.authMode,
      status: response.status,
    } as const;
  } catch (error) {
    logInternalError(error, {
      area: "wordpress_media",
      action: "connection_check_failed",
    });
    return {
      configured: true,
      reachable: false,
      authMode: config.authMode,
      status: 0,
    } as const;
  }
}

export async function deleteProductImageFromWordPress(mediaId: number) {
  const config = getWordPressMediaRuntimeConfig();
  if (!config.isConfigured) return false;
  const url = new URL(`${config.baseUrl}/wp-json/wp/v2/media/${encodeURIComponent(String(mediaId))}`);
  url.searchParams.set("force", "true");
  const response = await requestWooCommerceJson<unknown>(url, { method: "DELETE", headers: { Authorization: authorizationHeader(config), Accept: "application/json" }, allowSelfSignedTls: allowSelfSignedTlsForWooUrl(url) });
  return response.ok;
}

async function updateWordPressMediaMetadata(input: {
  mediaId: number;
  title: string;
  alt: string;
}) {
  const config = getWordPressMediaRuntimeConfig();
  const url = new URL(
    `${config.baseUrl}/wp-json/wp/v2/media/${encodeURIComponent(String(input.mediaId))}`,
  );
  try {
    const response = await requestWooCommerceJson<WordPressMediaResponse>(url, {
      method: "POST",
      headers: {
        Authorization: authorizationHeader(config),
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: input.title, alt_text: input.alt }),
      allowSelfSignedTls: allowSelfSignedTlsForWooUrl(url),
    });
    if (!response.ok) {
      logInternalError(new Error(`wordpress_media_metadata_${classifyStatus(response.status)}`), {
        area: "wordpress_media",
        action: "metadata_update_skipped",
        mediaId: input.mediaId,
      });
    }
  } catch (error) {
    // Upload tetap valid walau metadata tambahan gagal; WooCommerce masih menerima id media.
    logInternalError(error, {
      area: "wordpress_media",
      action: "metadata_update_skipped",
      mediaId: input.mediaId,
    });
  }
}

function authorizationHeader(
  config: ReturnType<typeof getWordPressMediaRuntimeConfig>,
) {
  if (config.token) return `Bearer ${config.token}`;
  return `Basic ${Buffer.from(`${config.username}:${config.appPassword}`).toString("base64")}`;
}

function normalizeMediaResponse(
  payload: WordPressMediaResponse,
  configuredBaseUrl: string,
): WordPressMediaUploadResult {
  const id = Number(payload.id);
  const absoluteSourceUrl =
    typeof payload.source_url === "string"
      ? normalizeWooCommerceMediaUrl(payload.source_url, configuredBaseUrl)
      : "";
  if (!Number.isInteger(id) || id <= 0 || !isSafeHttpUrl(absoluteSourceUrl)) {
    throw new Error("wordpress_media_invalid_response");
  }
  const mediaFile = typeof payload.media_details?.file === "string" ? payload.media_details.file.trim() : "";
  const filename = basename(mediaFile) || basename(absoluteSourceUrl);
  const mimeType = typeof payload.mime_type === "string" ? payload.mime_type.trim().toLowerCase() : "";
  const extension = filename.includes(".") ? filename.split(".").at(-1)!.toLowerCase() : "";
  return {
    id,
    // URL absolut divalidasi dulu (isSafeHttpUrl di atas), baru dialihkan ke
    // proxy same-origin untuk base loopback/`.local` — preview admin dan
    // site-content baru jadi aman diakses dari perangkat LAN lain.
    sourceUrl: toSameOriginWordPressMediaUrl(absoluteSourceUrl, configuredBaseUrl),
    targetMediaUrl: absoluteSourceUrl,
    filename,
    mimeType,
    extension,
    slug: typeof payload.slug === "string" ? payload.slug.trim() : "",
    alt: typeof payload.alt_text === "string" ? payload.alt_text.trim() : "",
    title:
      typeof payload.title?.rendered === "string"
        ? payload.title.rendered.replace(/<[^>]*>/g, " ").trim()
        : "",
  };
}

function basename(value: string) {
  if (!value) return "";
  try { return decodeURIComponent(new URL(value, "http://wordpress.local").pathname.split("/").at(-1) ?? ""); }
  catch { return value.replace(/\\/g, "/").split("/").at(-1) ?? ""; }
}

function normalizeWordPressBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    parsed.pathname = parsed.pathname
      .replace(/\/wp-json\/wc\/v3\/?$/, "")
      .replace(/\/wp-json\/wp\/v2\/?$/, "")
      .replace(/\/+$/, "");
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function escapeHeaderFilename(value: string) {
  return value.replace(/["\\\r\n]/g, "-").slice(0, 180);
}

function isSafeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function positiveNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function classifyStatus(status: number) {
  if (status === 401 || status === 403) return "auth_failed";
  if (status === 404) return "endpoint_missing";
  if (status === 413) return "file_too_large";
  if (status === 415) return "mime_rejected";
  return "request_failed";
}

async function requestWordPressMediaRead<T>(url:URL,init:Parameters<typeof requestWooCommerceJson<T>>[1]){
  for(let attempt=1;attempt<=3;attempt+=1){const startedAt=Date.now();try{const response=await requestWooCommerceJson<T>(url,init);if(response.ok)return response;const transient=[429,502,503,504].includes(response.status);console.warn("WORDPRESS_MEDIA_PROVIDER_ERROR",{operation:"read_media",method:"GET",path:url.pathname,statusCode:response.status,errorCode:`HTTP_${response.status}`,errorName:"HttpError",elapsedMs:Date.now()-startedAt,attemptNumber:attempt});if(!transient||attempt===3)return response;}catch(error){const value=error as {code?:string;name?:string;cause?:{code?:string}};const code=value.code??value.cause?.code??"UNKNOWN_PROVIDER_ERROR";const transient=["ECONNRESET","ECONNREFUSED","ETIMEDOUT","EPIPE","ECONNABORTED","INVALID_RESPONSE","UND_ERR_CONNECT_TIMEOUT","UND_ERR_HEADERS_TIMEOUT"].includes(code);console.warn("WORDPRESS_MEDIA_PROVIDER_ERROR",{operation:"read_media",method:"GET",path:url.pathname,statusCode:0,errorCode:code,errorName:value.name??"Error",elapsedMs:Date.now()-startedAt,attemptNumber:attempt});if(!transient||attempt===3)throw error;}await new Promise(resolve=>setTimeout(resolve,attempt===1?500:1500));}
  throw new Error("wordpress_media_unavailable");
}
