import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

type PostgrestErrorPayload = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

const DOCUMENT_COLUMNS = [
  "id",
  "company_id",
  "document_type",
  "entity_type",
  "entity_id",
  "document_number",
  "template_id",
  "file_id",
  "storage_bucket",
  "storage_key",
  "status",
] as const;

run().catch((error: unknown) => {
  console.error("ERROR: Ofissio documents check gagal.");
  console.error(`Reason: ${safeReason(error)}`);
  process.exitCode = 1;
});

async function run() {
  printHeader();
  assertNoPublicSecrets();

  const databaseProvider = env("DATABASE_PROVIDER", "mock");
  const storageProvider = env("STORAGE_PROVIDER", "mock");
  console.log(`databaseProvider=${databaseProvider}`);
  console.log(`storageProvider=${storageProvider}`);

  if (databaseProvider !== "supabase") {
    console.log("OK: DATABASE_PROVIDER mock; documents table check skipped.");
    return;
  }

  const baseUrl = normalizeSupabaseUrl(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"));
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  assertServiceRoleKey(serviceRoleKey);

  const table = await checkDocumentsTable(baseUrl, serviceRoleKey);
  if (table === "missing") {
    console.log("SKIP: documents table belum tersedia. Jalankan database/migrations/007_documents_pdf.sql secara manual di Supabase.");
    console.log("INFO: Missing migration tidak memblokir dev check sampai Phase 22 migration diterapkan.");
    await checkDocumentsBucketIfNeeded(baseUrl, serviceRoleKey, storageProvider);
    return;
  }

  console.log("OK: documents table reachable.");
  await checkDocumentsBucketIfNeeded(baseUrl, serviceRoleKey, storageProvider);

  if (env("DOCUMENT_TEST_GENERATE", "false") === "true") {
    await optionalGenerateSmoke(baseUrl, serviceRoleKey);
  } else {
    console.log("INFO: PDF generation smoke skipped. Set DOCUMENT_TEST_GENERATE=true dan jalankan dev server untuk generate test.");
  }
}

async function checkDocumentsTable(baseUrl: string, key: string) {
  const select = DOCUMENT_COLUMNS.join(",");
  const response = await fetch(`${baseUrl}/rest/v1/documents?select=${select}&limit=1`, {
    method: "GET",
    headers: authHeaders(key),
    cache: "no-store",
  }).catch(() => null);
  if (!response) throw new Error("documents_network_error");
  if (response.ok) return "ready" as const;
  const payload = await parseErrorPayload(response);
  const reason = classifyError(response, payload);
  if (reason === "relation_missing") return "missing" as const;
  if (reason === "column_missing") {
    console.log(`ERROR: documents table ada tapi kolom penting belum lengkap. code=${payload?.code ?? "n/a"}`);
    process.exitCode = 1;
    return "invalid" as const;
  }
  throw new Error(`documents_query_failed_${response.status}_${reason}`);
}

async function checkDocumentsBucketIfNeeded(
  baseUrl: string,
  key: string,
  storageProvider: string,
) {
  if (storageProvider !== "supabase") {
    console.log("OK: storage mock; ofissio-documents bucket live check skipped.");
    return;
  }
  const bucket = env("STORAGE_BUCKET_DOCUMENTS", "ofissio-documents");
  const response = await fetch(`${baseUrl}/storage/v1/bucket`, {
    method: "GET",
    headers: authHeaders(key),
    cache: "no-store",
  }).catch(() => null);
  if (!response) throw new Error("storage_network_error");
  if (!response.ok) throw new Error(`storage_bucket_list_failed_${response.status}`);
  const payload = (await response.json().catch(() => [])) as Array<{
    id?: unknown;
    name?: unknown;
  }>;
  const exists = payload.some((item) => item.id === bucket || item.name === bucket);
  if (!exists) throw new Error("ofissio_documents_bucket_missing");
  console.log(`OK: bucket reachable ${bucket}`);
}

async function optionalGenerateSmoke(baseUrl: string, key: string) {
  const appUrl = env("DOCUMENT_TEST_BASE_URL", env("APP_URL", "http://localhost:8000")).replace(/\/+$/, "");
  const latestQuotation = await latestId(baseUrl, key, "quotations", {
    status: "quoted",
  });
  if (!latestQuotation) {
    console.log("SKIP: Tidak ada latest quoted quotation untuk DOCUMENT_TEST_GENERATE.");
    return;
  }
  const response = await fetch(`${appUrl}/api/admin/quotations/${latestQuotation}/generate-pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ofissio-internal-role": "super_admin",
      "x-ofissio-internal-user-id": "document-check",
    },
    body: JSON.stringify({ forceRegenerate: false }),
  }).catch(() => null);
  if (!response) {
    console.log("SKIP: Dev server tidak bisa dijangkau untuk DOCUMENT_TEST_GENERATE.");
    return;
  }
  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    console.log(`ERROR: Generate quotation PDF smoke gagal status=${response.status} body=${payload.slice(0, 160)}`);
    process.exitCode = 1;
    return;
  }
  console.log("OK: DOCUMENT_TEST_GENERATE quotation PDF endpoint responded ok.");
}

async function latestId(
  baseUrl: string,
  key: string,
  table: string,
  filters: Record<string, string>,
) {
  const params = new URLSearchParams({
    select: "id",
    order: "created_at.desc",
    limit: "1",
  });
  for (const [name, value] of Object.entries(filters)) {
    params.set(name, `eq.${value}`);
  }
  const response = await fetch(`${baseUrl}/rest/v1/${table}?${params}`, {
    headers: authHeaders(key),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const payload = (await response.json().catch(() => [])) as Array<{ id?: unknown }>;
  return typeof payload[0]?.id === "string" ? payload[0].id : null;
}

function authHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };
}

function env(name: string, fallback: string) {
  return process.env[name]?.trim() || fallback;
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_missing`);
  return value;
}

function normalizeSupabaseUrl(value: string) {
  try {
    const parsed = new URL(value.trim().replace(/\/+$/, ""));
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
      throw new Error("invalid_url");
    }
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    throw new Error("invalid_supabase_url");
  }
}

function assertServiceRoleKey(key: string) {
  const role = decodeJwtRole(key);
  if (role && role !== "service_role") {
    throw new Error("invalid_key: SUPABASE_SERVICE_ROLE_KEY bukan service_role.");
  }
}

function assertNoPublicSecrets() {
  if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    throw new Error("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY_forbidden");
  }
  if (process.env.NEXT_PUBLIC_RESEND_API_KEY?.trim()) {
    throw new Error("NEXT_PUBLIC_RESEND_API_KEY_forbidden");
  }
}

function decodeJwtRole(key: string) {
  const [, payload] = key.split(".");
  if (!payload) return null;
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
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
    return { message: text.slice(0, 160) };
  }
}

function classifyError(response: Response, payload: PostgrestErrorPayload | null) {
  const message = `${payload?.code ?? ""} ${payload?.message ?? ""} ${payload?.details ?? ""} ${payload?.hint ?? ""}`.toLowerCase();
  if (
    payload?.code === "42P01" ||
    payload?.code === "PGRST205" ||
    (message.includes("relation") && message.includes("does not exist")) ||
    message.includes("could not find the table")
  ) {
    return "relation_missing";
  }
  if (
    payload?.code === "PGRST204" ||
    payload?.code === "42703" ||
    message.includes("column")
  ) {
    return "column_missing";
  }
  if (response.status === 401 || message.includes("invalid")) return "invalid_key";
  if (response.status === 403 || message.includes("permission")) return "permission_denied";
  return "query_error";
}

function printHeader() {
  const title = "Ofissio PDF documents check";
  console.log(title);
  console.log("-".repeat(title.length));
}

function safeReason(error: unknown) {
  if (!(error instanceof Error)) return "unknown_error";
  return error.message.replace(
    /(api[_-]?key|secret|token|password|signature|authorization)=?[^\s,]*/gi,
    "$1=[redacted]",
  );
}
