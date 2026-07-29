import { loadEnvConfig } from "@next/env";

import { REQUIRED_SUPABASE_TABLES } from "../src/features/database/supabase-schema";

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

type TableCheckResult =
  | { ok: true; table: string }
  | {
      ok: false;
      table: string;
      reason: SupabaseCheckReason;
      status?: number;
      code?: string;
    };

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const provider = normalizeProvider(process.env.DATABASE_PROVIDER);
const requiredEnvNames = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

run().catch((error: unknown) => {
  console.error("ERROR: Supabase schema check gagal.");
  console.error(`Reason: ${safeErrorReason(error)}`);
  process.exitCode = 1;
});

async function run() {
  printHeader();
  assertNoForbiddenPublicSecret();

  if (provider !== "supabase") {
    console.log(`SKIP: DATABASE_PROVIDER=${provider}; schema check hanya untuk supabase.`);
    return;
  }

  const missingEnv = requiredEnvNames.filter((name) => !process.env[name]?.trim());
  if (missingEnv.length > 0) {
    console.log(`ERROR: Env Supabase belum lengkap: ${missingEnv.join(", ")}.`);
    process.exitCode = 1;
    return;
  }

  const baseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  assertServiceRoleKey(serviceRoleKey);

  const results: TableCheckResult[] = [];
  for (const table of REQUIRED_SUPABASE_TABLES) {
    results.push(await checkTable(baseUrl, serviceRoleKey, table));
  }
  const missingTables = results
    .filter(
      (
        result,
      ): result is Extract<TableCheckResult, { ok: false }> =>
        !result.ok && result.reason === "relation_does_not_exist",
    )
    .map((result) => result.table);
  const hardFailures = results.filter(
    (result): result is Extract<TableCheckResult, { ok: false }> =>
      !result.ok && result.reason !== "relation_does_not_exist",
  );

  if (hardFailures.length > 0) {
    for (const failure of hardFailures) {
      console.log(
        `ERROR: ${failure.table} tidak bisa dicek (${failure.reason}, status ${
          failure.status ?? "n/a"
        }, code ${failure.code ?? "n/a"}).`,
      );
    }
    process.exitCode = 1;
    return;
  }

  if (missingTables.length > 0) {
    console.log("ERROR: Supabase schema missing.");
    console.log(`Missing tables: ${missingTables.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `OK: schema ready. ${REQUIRED_SUPABASE_TABLES.length} required tables reachable.`,
  );
  console.log("OK: Phase 19 process-order tables are part of the required schema.");
  console.log("INFO: Tabel kosong tetap dianggap valid selama tabel bisa di-query.");
}

async function checkTable(
  baseUrl: string,
  serviceRoleKey: string,
  table: string,
): Promise<TableCheckResult> {
  const url = `${baseUrl}/rest/v1/${table}?select=id&limit=1`;
  let response: Response;

  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      cache: "no-store",
    });
  } catch {
    return { ok: false, table, reason: "network_error" };
  }

  if (response.ok) return { ok: true, table };

  const payload = await parseErrorPayload(response);
  return {
    ok: false,
    table,
    reason: classifySupabaseError(response, payload),
    status: response.status,
    code: payload?.code,
  };
}

function printHeader() {
  const title = "Ofissio Supabase schema check";
  console.log(title);
  console.log("-".repeat(title.length));
}

function normalizeProvider(value: string | undefined) {
  return value === "supabase" || value === "postgres" ? value : "mock";
}

function assertNoForbiddenPublicSecret() {
  if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    throw new Error("invalid_key: NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY tidak boleh diset.");
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
    message.includes("could not find the table")
  ) {
    return "relation_does_not_exist";
  }

  if (message.includes("row-level security")) {
    return "rls_denied";
  }

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
