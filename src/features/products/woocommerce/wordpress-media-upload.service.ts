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

const DEFAULT_PRODUCT_IMAGE_MAX_MB = 10;
// WordPress generates attachment metadata and several thumbnails before the
// media endpoint responds. Large PNG files can legitimately take longer than
// the normal WooCommerce JSON request timeout.
const WORDPRESS_MEDIA_UPLOAD_TIMEOUT_MS = 120_000;

interface WordPressMediaResponse {
  id?: unknown;
  source_url?: unknown;
  alt_text?: unknown;
  title?: { rendered?: unknown };
}

export interface WordPressMediaUploadResult {
  id: number;
  sourceUrl: string;
  alt: string;
  title: string;
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
  data: Uint8Array;
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
      body: input.data,
      allowSelfSignedTls: allowSelfSignedTlsForWooUrl(url),
      timeoutMs: WORDPRESS_MEDIA_UPLOAD_TIMEOUT_MS,
    });
    if (!response.ok) {
      throw new Error(`wordpress_media_upload_${classifyStatus(response.status)}`);
    }

    const uploaded = normalizeMediaResponse(response.data);
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
      sizeBytes: input.data.byteLength,
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
    const response = await requestWooCommerceJson<unknown[]>(url, {
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

function normalizeMediaResponse(payload: WordPressMediaResponse) {
  const id = Number(payload.id);
  const sourceUrl = typeof payload.source_url === "string" ? payload.source_url.trim() : "";
  if (!Number.isInteger(id) || id <= 0 || !isSafeHttpUrl(sourceUrl)) {
    throw new Error("wordpress_media_invalid_response");
  }
  return {
    id,
    sourceUrl,
    alt: typeof payload.alt_text === "string" ? payload.alt_text.trim() : "",
    title:
      typeof payload.title?.rendered === "string"
        ? payload.title.rendered.replace(/<[^>]*>/g, " ").trim()
        : "",
  };
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
