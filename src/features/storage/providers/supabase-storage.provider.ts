import "server-only";

import { getOptionalServerEnv } from "@/lib/security/server-only-secret";
import { logInternalError } from "@/lib/security/safe-error-response";

import type { StorageObjectProvider } from "../storage.types";

function supabaseStorageConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  const serviceRoleKey = getOptionalServerEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase Storage env belum lengkap.");
  }
  return { url, serviceRoleKey };
}

function headers(contentType?: string) {
  const { serviceRoleKey } = supabaseStorageConfig();
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    ...(contentType ? { "Content-Type": contentType } : {}),
  };
}

function objectUrl(baseUrl: string, bucket: string, key: string) {
  const safeBucket = encodeURIComponent(bucket);
  const safeKey = key.split("/").map(encodeURIComponent).join("/");
  return `${baseUrl}/storage/v1/object/${safeBucket}/${safeKey}`;
}

async function assertOk(
  response: Response,
  action: string,
  context: { bucket?: string } = {},
) {
  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    logInternalError(new Error(`Supabase Storage ${action} failed.`), {
      area: "supabase_storage",
      action,
      status: response.status,
      bucket: context.bucket,
      reason: classifyStorageError(response, payload),
    });
    throw new Error("Supabase Storage belum dapat memproses file.");
  }
}

function classifyStorageError(response: Response, payload: string) {
  const message = payload.toLowerCase();
  if (response.status === 401 || message.includes("invalid jwt")) return "invalid_key";
  if (response.status === 403 || message.includes("permission")) return "permission_denied";
  if (response.status === 404 || message.includes("not found")) return "not_found";
  if (message.includes("bucket")) return "bucket_error";
  return "query_error";
}

export const supabaseStorageProvider: StorageObjectProvider = {
  name: "supabase",

  async uploadObject(input) {
    const { url } = supabaseStorageConfig();
    let response: Response;
    try {
      response = await fetch(objectUrl(url, input.bucket, input.key), {
        method: "PUT",
        headers: {
          ...headers(input.mimeType),
          "x-upsert": "false",
        },
        body: new Blob([input.data as BlobPart], { type: input.mimeType }),
      });
    } catch (error) {
      logInternalError(error, {
        area: "supabase_storage",
        action: "upload",
        bucket: input.bucket,
        reason: "network_error",
      });
      throw new Error("Supabase Storage belum dapat dihubungi.");
    }
    await assertOk(response, "upload", { bucket: input.bucket });
    return { publicUrl: null };
  },

  async getSignedUrl(input) {
    const { url } = supabaseStorageConfig();
    const safeBucket = encodeURIComponent(input.bucket);
    const safeKey = input.key.split("/").map(encodeURIComponent).join("/");
    let response: Response;
    try {
      response = await fetch(`${url}/storage/v1/object/sign/${safeBucket}/${safeKey}`, {
        method: "POST",
        headers: headers("application/json"),
        body: JSON.stringify({ expiresIn: input.expiresInSeconds }),
      });
    } catch (error) {
      logInternalError(error, {
        area: "supabase_storage",
        action: "signed-url",
        bucket: input.bucket,
        reason: "network_error",
      });
      throw new Error("Supabase Storage belum dapat dihubungi.");
    }
    await assertOk(response, "signed-url", { bucket: input.bucket });
    const payload = (await response.json().catch(() => null)) as
      | { signedURL?: string; signedUrl?: string }
      | null;
    const path = payload?.signedURL ?? payload?.signedUrl;
    if (!path) throw new Error("Signed URL Supabase belum tersedia.");
    return {
      signedUrl: path.startsWith("http") ? path : `${url}/storage/v1${path}`,
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000).toISOString(),
    };
  },

  async deleteObject(input) {
    const { url } = supabaseStorageConfig();
    let response: Response;
    try {
      response = await fetch(`${url}/storage/v1/object/${encodeURIComponent(input.bucket)}`, {
        method: "DELETE",
        headers: headers("application/json"),
        body: JSON.stringify({ prefixes: [input.key] }),
      });
    } catch (error) {
      logInternalError(error, {
        area: "supabase_storage",
        action: "delete",
        bucket: input.bucket,
        reason: "network_error",
      });
      throw new Error("Supabase Storage belum dapat dihubungi.");
    }
    await assertOk(response, "delete", { bucket: input.bucket });
  },

  async fileExists(input) {
    return (await this.getFileMetadata(input)).exists;
  },

  async getFileMetadata(input) {
    const { url } = supabaseStorageConfig();
    let response: Response;
    try {
      response = await fetch(objectUrl(url, input.bucket, input.key), {
        method: "HEAD",
        headers: headers(),
        cache: "no-store",
      });
    } catch (error) {
      logInternalError(error, {
        area: "supabase_storage",
        action: "metadata",
        bucket: input.bucket,
        reason: "network_error",
      });
      throw new Error("Supabase Storage belum dapat dihubungi.");
    }
    if (response.status === 404) {
      return { exists: false, sizeBytes: null, contentType: null };
    }
    await assertOk(response, "metadata", { bucket: input.bucket });
    const size = Number(response.headers.get("content-length"));
    return {
      exists: true,
      sizeBytes: Number.isFinite(size) ? size : null,
      contentType: response.headers.get("content-type"),
    };
  },
};
