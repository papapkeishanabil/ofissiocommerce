import { createHmac, randomBytes } from "node:crypto";
import { once } from "node:events";
import type { ClientRequest } from "node:http";
import { request as httpRequest } from "node:http";
import { Agent as HttpsAgent, request as httpsRequest } from "node:https";

const REQUEST_TIMEOUT_MS = 30_000;

interface WooJsonRequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string | Uint8Array | ReadableStream<Uint8Array>;
  bodyLength?: number;
  allowSelfSignedTls?: boolean;
  timeoutMs?: number;
}

export interface WooJsonResponse<T> {
  ok: boolean;
  status: number;
  data: T;
  text: string;
}

export function allowSelfSignedTlsForWooUrl(url: URL) {
  const flag = process.env.WOOCOMMERCE_ALLOW_SELF_SIGNED_TLS?.trim().toLowerCase();
  if (flag === "false" || process.env.NODE_ENV === "production") return false;
  if (flag === "true") return true;

  const host = url.hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
}

/**
 * Local WP exposes the site through a plain-HTTP loopback port and its Nginx
 * config does not forward the Authorization header to PHP. WooCommerce
 * requires OAuth 1.0 signing for this transport. Keep the fallback strictly
 * loopback-only; remote and production URLs continue to use Basic Auth over
 * HTTPS and never receive credentials in the query string.
 */
export function applyWooCommerceLoopbackAuth(
  url: URL,
  consumerKey: string,
  consumerSecret: string,
  method = "GET",
) {
  if (url.protocol !== "http:" || !isLoopbackHost(url.hostname)) return false;

  url.searchParams.set("oauth_consumer_key", consumerKey);
  url.searchParams.set("oauth_nonce", randomBytes(16).toString("hex"));
  url.searchParams.set("oauth_signature_method", "HMAC-SHA256");
  url.searchParams.set("oauth_timestamp", String(Math.floor(Date.now() / 1_000)));
  url.searchParams.set("oauth_version", "1.0");

  const normalizedParams = Array.from(url.searchParams.entries())
    .map(([key, value]) => [oauthEncode(key), oauthEncode(value)] as const)
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey === rightKey
        ? leftValue.localeCompare(rightValue)
        : leftKey.localeCompare(rightKey),
    )
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const baseUrl = `${url.origin}${url.pathname}`;
  const signatureBase = [
    method.toUpperCase(),
    oauthEncode(baseUrl),
    oauthEncode(normalizedParams),
  ].join("&");
  const signingKey = `${oauthEncode(consumerSecret)}&`;
  const signature = createHmac("sha256", signingKey)
    .update(signatureBase)
    .digest("base64");

  url.searchParams.set("oauth_signature", signature);
  return true;
}

function oauthEncode(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function isLoopbackHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

export function requestWooCommerceJson<T>(
  url: URL,
  init: WooJsonRequestInit = {},
): Promise<WooJsonResponse<T>> {
  return new Promise((resolve, reject) => {
    const body = init.body;
    const bodyLength =
      init.bodyLength ??
      (typeof body === "string" || body instanceof Uint8Array
        ? Buffer.byteLength(body)
        : undefined);
    const headers = {
      ...init.headers,
      ...(bodyLength != null ? { "Content-Length": String(bodyLength) } : {}),
    };
    const requestImpl = url.protocol === "http:" ? httpRequest : httpsRequest;
    const agent =
      url.protocol === "https:" && init.allowSelfSignedTls
        ? new HttpsAgent({ rejectUnauthorized: false })
        : undefined;
    const req = requestImpl(
      url,
      {
        method: init.method ?? "GET",
        headers,
        agent,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer | string) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          try {
            resolve({
              ok: Boolean(res.statusCode && res.statusCode >= 200 && res.statusCode < 300),
              status: res.statusCode ?? 0,
              data: (text ? JSON.parse(text) : null) as T,
              text,
            });
          } catch {
            reject(new Error("invalid_response"));
          }
        });
      },
    );

    req.setTimeout(init.timeoutMs ?? REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error("network_error"));
    });
    req.on("error", reject);
    void writeRequestBody(req, body).catch((error) => {
      req.destroy(error instanceof Error ? error : new Error("network_error"));
    });
  });
}

async function writeRequestBody(
  request: ClientRequest,
  body: WooJsonRequestInit["body"],
) {
  if (!body) {
    request.end();
    return;
  }
  if (typeof body === "string" || body instanceof Uint8Array) {
    request.end(body);
    return;
  }

  const reader = body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!request.write(value)) await once(request, "drain");
    }
    request.end();
  } finally {
    reader.releaseLock();
  }
}
