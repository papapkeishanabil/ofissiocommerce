import { existsSync } from "node:fs";
import { join } from "node:path";

import { loadEnvConfig } from "@next/env";

import {
  PHASE_24_SHIPMENT_COLUMNS,
  PHASE_24_SHIPMENT_TABLES,
} from "../src/features/database/supabase-schema";

type SupabaseCheckReason =
  | "invalid_key"
  | "invalid_url"
  | "relation_does_not_exist"
  | "permission_denied"
  | "rls_denied"
  | "network_error"
  | "query_error";

type PostgrestErrorPayload = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

run().catch((error: unknown) => {
  console.error("ERROR: Shipping check gagal.");
  console.error(`Reason: ${safeErrorReason(error)}`);
  process.exitCode = 1;
});

async function run() {
  printHeader();
  assertNoPublicShippingSecrets();

  const migrationPath = join(
    process.cwd(),
    "database",
    "migrations",
    "009_shipments_flow.sql",
  );
  if (!existsSync(migrationPath)) {
    console.log("ERROR: Migration 009_shipments_flow.sql belum ada.");
    process.exitCode = 1;
    return;
  }
  console.log("OK: migration 009_shipments_flow.sql tersedia.");
  console.log("OK: SHIPPING_PROVIDER default manual; provider API live tidak dipanggil.");

  const provider = normalizeProvider(process.env.DATABASE_PROVIDER);
  if (provider !== "supabase") {
    console.log(`SKIP: DATABASE_PROVIDER=${provider}; live shipment table check skipped.`);
    return;
  }

  const missingEnv = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ].filter((name) => !process.env[name]?.trim());
  if (missingEnv.length > 0) {
    console.log(`SKIP: Supabase env belum lengkap untuk live shipment check: ${missingEnv.join(", ")}.`);
    return;
  }

  const baseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  assertServiceRoleKey(serviceRoleKey);

  const shipmentsColumns = await checkColumns(
    baseUrl,
    serviceRoleKey,
    "shipments",
    PHASE_24_SHIPMENT_COLUMNS,
  );
  const shipmentEvents = await checkTable(baseUrl, serviceRoleKey, PHASE_24_SHIPMENT_TABLES[0]);

  if (!shipmentsColumns.ok || !shipmentEvents.ok) {
    const reasons = [
      !shipmentsColumns.ok
        ? `shipments columns: ${shipmentsColumns.reason}`
        : null,
      !shipmentEvents.ok
        ? `shipment_events table: ${shipmentEvents.reason}`
        : null,
    ].filter(Boolean);
    console.log(
      `SKIP: Migration 009 belum terlihat aktif di Supabase (${reasons.join(", ")}).`,
    );
    console.log("INFO: Jalankan database/migrations/009_shipments_flow.sql manual sebelum live shipment persistence smoke.");
    return;
  }

  console.log(
    `OK: shipments Phase 24 columns reachable (${PHASE_24_SHIPMENT_COLUMNS.length} columns).`,
  );
  console.log("OK: shipment_events table reachable.");
  console.log("OK: Shipment schema ready untuk manual shipping flow.");
}

async function checkTable(
  baseUrl: string,
  serviceRoleKey: string,
  table: string,
) {
  const url = `${baseUrl}/rest/v1/${table}?select=id&limit=1`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      cache: "no-store",
    });
    if (response.ok) return { ok: true as const, table };
    const payload = await parseErrorPayload(response);
    return {
      ok: false as const,
      table,
      reason: classifySupabaseError(response, payload),
      status: response.status,
      code: payload?.code,
    };
  } catch {
    return { ok: false as const, table, reason: "network_error" as const };
  }
}

async function checkColumns(
  baseUrl: string,
  serviceRoleKey: string,
  table: string,
  columns: readonly string[],
) {
  const select = ["id", ...columns].join(",");
  const url = `${baseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=1`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      cache: "no-store",
    });
    if (response.ok) return { ok: true as const, table, columns };
    const payload = await parseErrorPayload(response);
    return {
      ok: false as const,
      table,
      columns,
      reason: classifySupabaseError(response, payload),
      status: response.status,
      code: payload?.code,
    };
  } catch {
    return { ok: false as const, table, columns, reason: "network_error" as const };
  }
}

function printHeader() {
  const title = "Ofissio shipping check";
  console.log(title);
  console.log("-".repeat(title.length));
}

function normalizeProvider(value: string | undefined) {
  return value === "supabase" || value === "postgres" ? value : "mock";
}

function assertNoPublicShippingSecrets() {
  const forbidden = [
    "NEXT_PUBLIC_SHIPPING_API_KEY",
    "NEXT_PUBLIC_SHIPPING_SECRET",
    "NEXT_PUBLIC_RAJAONGKIR_API_KEY",
  ];
  const found = forbidden.filter((name) => process.env[name]?.trim());
  if (found.length > 0) {
    console.log(`ERROR: Forbidden public shipping secret: ${found.join(", ")}.`);
    process.exitCode = 1;
  }
}

function normalizeSupabaseUrl(value: string) {
  const baseUrl = value.trim().replace(/\/+$/, "");
  try {
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
      throw new Error("invalid_url");
    }
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    throw new Error("invalid_url");
  }
}

function assertServiceRoleKey(key: string) {
  const role = decodeJwtRole(key);
  if (role && role !== "service_role") {
    throw new Error("invalid_key: SUPABASE_SERVICE_ROLE_KEY bukan service_role.");
  }
}

function decodeJwtRole(key: string) {
  const [, payload] = key.split(".");
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      Math.ceil(normalized.length / 4) * 4,
      "=",
    );
    const decoded = JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as {
      role?: unknown;
    };
    return typeof decoded.role === "string" ? decoded.role : null;
  } catch {
    return null;
  }
}

async function parseErrorPayload(response: Response) {
  const text = await response.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text) as PostgrestErrorPayload;
  } catch {
    return { message: text.slice(0, 120) };
  }
}

function classifySupabaseError(
  response: Response,
  payload: PostgrestErrorPayload | null,
): SupabaseCheckReason {
  const message = `${payload?.code ?? ""} ${payload?.message ?? ""} ${
    payload?.details ?? ""
  } ${payload?.hint ?? ""}`.toLowerCase();

  if (
    response.status === 401 ||
    message.includes("invalid api key") ||
    message.includes("invalid jwt") ||
    message.includes("jwt expired") ||
    message.includes("jwserror")
  ) {
    return "invalid_key";
  }

  if (
    payload?.code === "42P01" ||
    payload?.code === "PGRST205" ||
    (message.includes("relation") && message.includes("does not exist")) ||
    message.includes("could not find the table") ||
    (message.includes("could not find the") && message.includes("column"))
  ) {
    return "relation_does_not_exist";
  }

  if (message.includes("row-level security")) return "rls_denied";
  if (
    response.status === 403 ||
    payload?.code === "42501" ||
    message.includes("permission denied")
  ) {
    return "permission_denied";
  }

  return "query_error";
}

function safeErrorReason(error: unknown) {
  if (!(error instanceof Error)) return "query_error";
  const message = error.message.toLowerCase();
  if (message.includes("invalid_key")) return "invalid_key";
  if (message.includes("invalid_url")) return "invalid_url";
  if (message.includes("network")) return "network_error";
  if (message.includes("permission")) return "permission_denied";
  if (message.includes("row-level security")) return "rls_denied";
  if (message.includes("relation")) return "relation_does_not_exist";
  return "query_error";
}
