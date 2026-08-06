import "server-only";

import type { GineeMode, GineeRuntimeConfig } from "./ginee.types";

function env(name: string, fallback = "") {
  return process.env[name]?.trim() || fallback;
}

function boolEnv(name: string, fallback = false) {
  const value = process.env[name]?.trim().toLowerCase();
  return value ? value === "true" : fallback;
}

export function getGineeConfig(): GineeRuntimeConfig {
  const mode: GineeMode = env("GINEE_MODE", "sandbox").toLowerCase() === "live"
    ? "live"
    : "sandbox";
  const enabled = boolEnv("GINEE_ENABLED");
  const accessKey = env("GINEE_ACCESS_KEY");
  const secretKey = env("GINEE_SECRET_KEY");
  const testLive = boolEnv("GINEE_TEST_LIVE");
  const isConfigured = enabled && Boolean(accessKey && secretKey);

  return {
    enabled,
    mode,
    baseUrl: env("GINEE_BASE_URL", "https://api.ginee.com").replace(/\/+$/, ""),
    country: env("GINEE_COUNTRY", "ID").toUpperCase(),
    accessKey,
    secretKey,
    testLive,
    isConfigured,
    useLiveProvider: enabled && testLive && Boolean(accessKey && secretKey),
  };
}

export function validateGineeConfig(config = getGineeConfig()) {
  const errors: string[] = [];
  if (!/^https:\/\//i.test(config.baseUrl)) errors.push("GINEE_BASE_URL harus HTTPS.");
  if (!/^[A-Z]{2}$/.test(config.country)) errors.push("GINEE_COUNTRY tidak valid.");
  if (config.enabled && !config.accessKey) errors.push("GINEE_ACCESS_KEY belum diisi.");
  if (config.enabled && !config.secretKey) errors.push("GINEE_SECRET_KEY belum diisi.");
  if (config.testLive && !config.enabled) errors.push("GINEE_TEST_LIVE membutuhkan GINEE_ENABLED=true.");
  if (config.mode === "live" && !config.enabled) errors.push("Ginee live membutuhkan aktivasi eksplisit.");
  return errors;
}
