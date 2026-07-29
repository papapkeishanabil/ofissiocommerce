import { loadEnvConfig } from "@next/env";

const TABLES = [
  "quotations",
  "quotation_items",
  "email_logs",
  "uploaded_files",
  "company_logos",
  "audit_logs",
] as const;

type VerificationRow = {
  table: string;
  exists: boolean;
  count: number;
  latestCreatedAt: string | null;
  errorReason: string | null;
};

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

run().catch((error: unknown) => {
  console.error("ERROR: Supabase persistence verification gagal.");
  console.error(`Reason: ${safeErrorReason(error)}`);
  process.exitCode = 1;
});

async function run() {
  printHeader();
  assertSupabaseEnv();

  const baseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const rows: VerificationRow[] = [];

  for (const table of TABLES) {
    rows.push(await verifyTable(baseUrl, serviceRoleKey, table));
  }

  for (const row of rows) {
    const latest = row.latestCreatedAt ?? "-";
    if (row.exists) {
      console.log(
        `OK: ${row.table} exists=true count=${row.count} latest_created_at=${latest}`,
      );
    } else {
      console.log(`ERROR: ${row.table} exists=false reason=${row.errorReason}`);
    }
  }

  if (rows.some((row) => !row.exists)) {
    process.exitCode = 1;
    return;
  }

  console.log("OK: persistence tables reachable.");
  console.log("INFO: Table kosong tetap valid; smoke test API yang memastikan data baru.");
}

async function verifyTable(
  baseUrl: string,
  serviceRoleKey: string,
  table: string,
): Promise<VerificationRow> {
  const url = `${baseUrl}/rest/v1/${table}?select=id,created_at&order=created_at.desc&limit=1`;
  let response: Response;

  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: "count=exact",
        Range: "0-0",
      },
      cache: "no-store",
    });
  } catch {
    return {
      table,
      exists: false,
      count: 0,
      latestCreatedAt: null,
      errorReason: "network_error",
    };
  }

  if (!response.ok) {
    const payload = await parseErrorPayload(response);
    return {
      table,
      exists: false,
      count: 0,
      latestCreatedAt: null,
      errorReason: classifySupabaseError(response, payload),
    };
  }

  const payload = (await response.json().catch(() => [])) as Array<{
    created_at?: unknown;
  }>;
  return {
    table,
    exists: true,
    count: countFromContentRange(response.headers.get("content-range"), payload.length),
    latestCreatedAt:
      typeof payload[0]?.created_at === "string" ? payload[0].created_at : null,
    errorReason: null,
  };
}

function printHeader() {
  const title = "Ofissio Supabase persistence verification";
  console.log(title);
  console.log("-".repeat(title.length));
}

function assertSupabaseEnv() {
  if (process.env.DATABASE_PROVIDER !== "supabase") {
    throw new Error("query_error: DATABASE_PROVIDER bukan supabase.");
  }
  if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    throw new Error("invalid_key: NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY tidak boleh diset.");
  }
  for (const name of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]) {
    if (!process.env[name]?.trim()) {
      throw new Error(`query_error: ${name} belum tersedia.`);
    }
  }
}

function normalizeSupabaseUrl(value: string) {
  try {
    const parsed = new URL(value.trim().replace(/\/+$/, ""));
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
      throw new Error("invalid_url");
    }
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    throw new Error("invalid_url");
  }
}

function countFromContentRange(header: string | null, fallback: number) {
  const total = header?.split("/")[1];
  if (!total || total === "*") return fallback;
  const parsed = Number(total);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function parseErrorPayload(response: Response) {
  const text = await response.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text) as { code?: string; message?: string; details?: string; hint?: string };
  } catch {
    return { message: text.slice(0, 120) };
  }
}

function classifySupabaseError(
  response: Response,
  payload: { code?: string; message?: string; details?: string; hint?: string } | null,
) {
  const message = `${payload?.code ?? ""} ${payload?.message ?? ""} ${
    payload?.details ?? ""
  } ${payload?.hint ?? ""}`.toLowerCase();

  if (response.status === 401 || message.includes("invalid jwt")) return "invalid_key";
  if (
    payload?.code === "42P01" ||
    payload?.code === "PGRST205" ||
    (message.includes("relation") && message.includes("does not exist")) ||
    message.includes("could not find the table")
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
  if (message.includes("permission")) return "permission_denied";
  if (message.includes("row-level security")) return "rls_denied";
  if (message.includes("relation")) return "relation_does_not_exist";
  if (message.includes("network")) return "network_error";
  return "query_error";
}
