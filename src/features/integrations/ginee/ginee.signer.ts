import "server-only";

import { createHmac } from "node:crypto";

export function buildGineeSignature(input: {
  method: string;
  requestUri: string;
  secretKey: string;
}) {
  const method = input.method.trim().toUpperCase();
  const requestUri = normalizeRequestUri(input.requestUri);
  if (!/^(GET|POST)$/.test(method)) throw new Error("Ginee read method tidak valid.");
  if (!input.secretKey) throw new Error("Ginee secret belum dikonfigurasi.");
  const signData = `${method}$${requestUri}$`;
  return createHmac("sha256", input.secretKey).update(signData, "utf8").digest("base64");
}

export function buildGineeAuthorization(input: {
  method: string;
  requestUri: string;
  accessKey: string;
  secretKey: string;
}) {
  if (!input.accessKey || input.accessKey.includes(":")) {
    throw new Error("Ginee access key tidak valid.");
  }
  const signature = buildGineeSignature(input);
  return `${input.accessKey}:${signature}`;
}

function normalizeRequestUri(value: string) {
  const uri = value.trim().split("?")[0] ?? "";
  if (!/^\/openapi\/[a-z0-9/_-]+$/i.test(uri)) {
    throw new Error("Ginee request URI tidak valid.");
  }
  return uri;
}
