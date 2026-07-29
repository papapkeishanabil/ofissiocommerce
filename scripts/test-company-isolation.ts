import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

type ApiResult<T> = {
  status: number;
  payload: T;
};

type UploadedFilePayload = {
  ok: boolean;
  file: {
    id: string;
    originalFilename: string;
    status: string;
  };
};

type CompanyLogoPayload = {
  ok: boolean;
  logo: {
    id: string;
    fileId: string;
    label: string;
  };
};

type CompanyLogoListPayload = {
  ok: boolean;
  logos: Array<{ id: string; fileId: string; label: string }>;
};

type QuotationPayload = {
  ok: boolean;
  quotation: {
    id: string;
    companyId: string;
    quotationNumber: string;
    totalQty: number;
    embroideryPointCount: number;
    emailStatus: string;
  };
  emails: Array<{ id: string; status: string; provider: string }>;
};

type QuotationListPayload = {
  ok: boolean;
  quotations: Array<{ id: string; companyId: string; quotationNumber: string }>;
};

const BASE_URL =
  process.env.PHASE15B_BASE_URL?.trim() ||
  process.env.APP_URL?.trim() ||
  "http://localhost:8000";
const runId = `PHASE15B_TEST_${new Date()
  .toISOString()
  .replace(/[-:.TZ]/g, "")
  .slice(0, 14)}`;
const companyA = `${runId}_COMPANY_A`;
const companyB = `${runId}_COMPANY_B`;
const userA = `${runId}_USER_A`;
const userB = `${runId}_USER_B`;

run().catch((error: unknown) => {
  console.error("ERROR: Company isolation smoke test gagal.");
  console.error(`Reason: ${safeErrorMessage(error)}`);
  process.exitCode = 1;
});

async function run() {
  printHeader();
  assertSupabaseEnv();
  await assertServerReady();

  const headersA = authHeaders({
    companyId: companyA,
    companyName: `${runId} Company A`,
    userId: userA,
    email: `${runId.toLowerCase()}-a@example.test`,
    name: `${runId} User A`,
  });
  const headersB = authHeaders({
    companyId: companyB,
    companyName: `${runId} Company B`,
    userId: userB,
    email: `${runId.toLowerCase()}-b@example.test`,
    name: `${runId} User B`,
  });

  const upload = await uploadLogo(headersA);
  const fileId = upload.payload.file.id;
  console.log(`OK: Company A uploaded logo metadata file_id=${fileId}`);

  const logo = await createCompanyLogo(headersA, fileId);
  console.log(`OK: Company A registered company logo logo_id=${logo.payload.logo.id}`);

  const logosA = await getJson<CompanyLogoListPayload>("/api/company/logos", {
    headers: headersA,
  });
  assertStatus(logosA.status, 200, "Company A logo list");
  assert(
    logosA.payload.logos.some((item) => item.fileId === fileId),
    "Company A logo list tidak memuat logo yang baru dibuat.",
  );
  console.log("OK: Company A logo visible in logo library.");

  const logosB = await getJson<CompanyLogoListPayload>("/api/company/logos", {
    headers: headersB,
  });
  assertStatus(logosB.status, 200, "Company B logo list");
  assert(
    !logosB.payload.logos.some((item) => item.fileId === fileId),
    "Company B tidak boleh melihat logo Company A.",
  );
  console.log("OK: Company A logo hidden from Company B.");

  const bFileDetail = await getJson<unknown>(`/api/files/${fileId}`, {
    headers: headersB,
  });
  assertSafeDenied(bFileDetail.status, "Company B file detail");
  console.log("OK: Company B cannot read Company A uploaded file.");

  const signed = await getJson<unknown>(`/api/files/${fileId}/signed-url`, {
    headers: headersA,
  });
  assertStatus(signed.status, 200, "Company A signed URL");
  console.log("OK: mock signed URL works for Company A file.");

  const invalidUpload = await uploadInvalidFile(headersA);
  assertStatus(invalidUpload.status, 400, "Invalid file upload");
  assert(!JSON.stringify(invalidUpload.payload).includes("SUPABASE"), "Upload error leaked raw provider detail.");
  console.log("OK: invalid upload rejected with safe response.");

  const quotation = await createQuotation(headersA, fileId);
  const quotationId = quotation.payload.quotation.id;
  console.log(
    `OK: quotation created quotation_id=${quotationId} email_status=${quotation.payload.quotation.emailStatus}`,
  );
  assert(
    quotation.payload.emails.length >= 1 &&
      quotation.payload.emails.every((email) =>
        ["mocked", "skipped"].includes(email.status),
      ),
    "Email mock/skipped result tidak sesuai config.",
  );
  console.log("OK: email mock/skipped result returned by quotation API.");

  const listA = await getJson<QuotationListPayload>("/api/quotation", {
    headers: headersA,
  });
  assertStatus(listA.status, 200, "Company A quotation list");
  assert(
    listA.payload.quotations.some((item) => item.id === quotationId),
    "Company A quotation list tidak memuat quotation baru.",
  );
  console.log("OK: Company A quotation list reads new Supabase record.");

  const detailA = await getJson<QuotationPayload>(`/api/quotation/${quotationId}`, {
    headers: headersA,
  });
  assertStatus(detailA.status, 200, "Company A quotation detail");
  assert(
    detailA.payload.quotation.id === quotationId,
    "Company A quotation detail tidak sesuai quotation baru.",
  );
  console.log("OK: Company A quotation detail reads Supabase record.");

  const detailB = await getJson<unknown>(`/api/quotation/${quotationId}`, {
    headers: headersB,
  });
  assertSafeDenied(detailB.status, "Company B quotation detail");
  console.log("OK: Company B cannot read Company A quotation.");

  await verifySupabaseRows({
    fileId,
    quotationId,
    logoId: logo.payload.logo.id,
  });

  console.log("OK: company isolation smoke test pass.");
}

async function uploadLogo(headers: HeadersInit) {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l1F9xwAAAABJRU5ErkJggg==",
    "base64",
  );
  const form = new FormData();
  form.append(
    "file",
    new File([png], `${runId}_logo.png`, { type: "image/png" }),
  );
  form.append("fileType", "company_logo");
  form.append("metadata", JSON.stringify({ label: `${runId} Logo` }));

  const result = await fetchApi<UploadedFilePayload>("/api/files/upload", {
    method: "POST",
    headers,
    body: form,
  });
  assertStatus(result.status, 201, "Upload logo");
  assert(result.payload.file?.id, "Upload logo tidak mengembalikan file id.");
  return result;
}

async function uploadInvalidFile(headers: HeadersInit) {
  const form = new FormData();
  form.append(
    "file",
    new File([Buffer.from("not-valid")], `${runId}_bad.exe`, {
      type: "application/x-msdownload",
    }),
  );
  form.append("fileType", "company_logo");
  return fetchApi<unknown>("/api/files/upload", {
    method: "POST",
    headers,
    body: form,
  });
}

async function createCompanyLogo(headers: HeadersInit, fileId: string) {
  const result = await postJson<CompanyLogoPayload>(
    "/api/company/logos",
    { fileId, label: `${runId} Registered Logo` },
    headers,
  );
  assertStatus(result.status, 201, "Create company logo");
  assert(result.payload.logo?.id, "Create company logo tidak mengembalikan logo id.");
  return result;
}

async function createQuotation(headers: HeadersInit, logoFileId: string) {
  const result = await postJson<QuotationPayload>(
    "/api/quotation/request",
    {
      picName: `${runId} PIC`,
      picEmail: `${runId.toLowerCase()}@example.test`,
      customerNotes: `${runId} quotation persistence smoke`,
      shippingDestination: "Jakarta, Indonesia",
      items: [
        {
          productId: "p-012",
          selectedColor: "Abu Color Block",
          sizeMatrix: { S: 20, M: 0, L: 0, XL: 0, "2XL": 0, "3XL": 0 },
          customization: `${runId} embroidery placement`,
          embroideryPlacements: [
            {
              zone: "right_chest",
              logoFileId,
              logoFileName: `${runId}_logo.png`,
              logoLabel: `${runId} Logo`,
              widthCm: 8,
              heightCm: 3.2,
              rotation: 0,
              technique: "embroidery",
              notes: `${runId} placement`,
            },
          ],
        },
      ],
    },
    headers,
  );
  assertStatus(result.status, 201, "Request quotation");
  assert(result.payload.quotation?.id, "Quotation API tidak mengembalikan id.");
  assert(
    result.payload.quotation.embroideryPointCount === 1,
    "Embroidery point count harus 1.",
  );
  return result;
}

async function verifySupabaseRows(input: {
  fileId: string;
  logoId: string;
  quotationId: string;
}) {
  const baseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const checks: Array<{
    label: string;
    table: string;
    filters: Record<string, string>;
    min: number;
  }> = [
    {
      label: "uploaded_files",
      table: "uploaded_files",
      filters: { id: input.fileId, company_id: companyA },
      min: 1,
    },
    {
      label: "company_logos",
      table: "company_logos",
      filters: { id: input.logoId, company_id: companyA },
      min: 1,
    },
    {
      label: "quotations",
      table: "quotations",
      filters: { id: input.quotationId, company_id: companyA },
      min: 1,
    },
    {
      label: "quotation_items",
      table: "quotation_items",
      filters: { quotation_id: input.quotationId },
      min: 1,
    },
    {
      label: "email_logs",
      table: "email_logs",
      filters: { company_id: companyA },
      min: 2,
    },
  ];

  for (const check of checks) {
    const count = await countSupabaseRows(baseUrl, key, check.table, check.filters);
    assert(
      count >= check.min,
      `${check.label} Supabase count ${count}, expected at least ${check.min}.`,
    );
    console.log(`OK: Supabase ${check.label} persisted count=${count}.`);
  }
}

async function countSupabaseRows(
  baseUrl: string,
  key: string,
  table: string,
  filters: Record<string, string>,
) {
  const params = new URLSearchParams({ select: "id" });
  for (const [name, value] of Object.entries(filters)) {
    params.set(name, `eq.${value}`);
  }
  const response = await fetch(`${baseUrl}/rest/v1/${table}?${params.toString()}`, {
    method: "GET",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "count=exact",
      Range: "0-0",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`query_error: ${table} count gagal.`);
  const payload = (await response.json().catch(() => [])) as unknown[];
  return countFromContentRange(response.headers.get("content-range"), payload.length);
}

async function assertServerReady() {
  const health = await getJson<{
    databaseProvider: string;
    databaseStatus: string;
    schemaStatus: string;
  }>("/api/health");
  assertStatus(health.status, 200, "Health");
  assert(health.payload.databaseProvider === "supabase", "Health provider bukan supabase.");
  assert(health.payload.databaseStatus === "connected", "Health database belum connected.");
  assert(health.payload.schemaStatus === "ready", "Health schema belum ready.");
  console.log("OK: /api/health connected ready.");
}

async function postJson<T>(path: string, body: unknown, headers: HeadersInit) {
  return fetchApi<T>(path, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function getJson<T>(path: string, init: RequestInit = {}) {
  return fetchApi<T>(path, { ...init, method: "GET" });
}

async function fetchApi<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
  });
  const text = await response.text();
  let payload: unknown = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { text: text.slice(0, 160) };
  }
  return { status: response.status, payload: payload as T };
}

function authHeaders(input: {
  companyId: string;
  companyName: string;
  userId: string;
  email: string;
  name: string;
}) {
  return {
    "x-ofissio-company-id": input.companyId,
    "x-ofissio-company-name": input.companyName,
    "x-ofissio-user-id": input.userId,
    "x-ofissio-user-email": input.email,
    "x-ofissio-user-name": input.name,
    "x-ofissio-role": "company_admin",
  };
}

function assertSupabaseEnv() {
  if (process.env.DATABASE_PROVIDER !== "supabase") {
    throw new Error("DATABASE_PROVIDER harus supabase.");
  }
  if (process.env.STORAGE_PROVIDER !== "mock") {
    throw new Error("STORAGE_PROVIDER harus mock untuk Phase 15B.");
  }
  if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    throw new Error("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY tidak boleh diset.");
  }
  for (const name of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]) {
    if (!process.env[name]?.trim()) {
      throw new Error(`${name} belum tersedia.`);
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

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertStatus(actual: number, expected: number, label: string) {
  if (actual !== expected) {
    throw new Error(`${label} expected HTTP ${expected}, got ${actual}.`);
  }
}

function assertSafeDenied(status: number, label: string) {
  if (status !== 403 && status !== 404) {
    throw new Error(`${label} expected safe 403/404, got ${status}.`);
  }
}

function printHeader() {
  const title = "Ofissio Phase 15B company isolation smoke test";
  console.log(title);
  console.log("-".repeat(title.length));
  console.log(`Run id: ${runId}`);
  console.log(`Base URL: ${BASE_URL}`);
}

function safeErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "unknown_error";
  return error.message.replace(
    /(api[_-]?key|secret|token|password|signature|authorization)=?[^\s,]*/gi,
    "$1=[redacted]",
  );
}
