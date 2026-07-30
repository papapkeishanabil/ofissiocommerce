import { randomUUID } from "node:crypto";

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

type BucketCheck = {
  bucket: string;
  ok: boolean;
  reason: string | null;
};

const REQUIRED_BUCKETS = [
  env("STORAGE_BUCKET_LOGOS", "ofissio-logos"),
  env("STORAGE_BUCKET_ARTWORK", "ofissio-artwork"),
  env("STORAGE_BUCKET_DOCUMENTS", "ofissio-documents"),
  env("STORAGE_BUCKET_3D", "ofissio-3d-models"),
] as const;

run().catch((error: unknown) => {
  console.error("ERROR: Ofissio storage check gagal.");
  console.error(`Reason: ${safeReason(error)}`);
  process.exitCode = 1;
});

async function run() {
  printHeader();
  assertNoPublicServiceRole();

  const provider = env("STORAGE_PROVIDER", "mock");
  console.log(`provider=${provider}`);

  if (provider !== "supabase") {
    console.log("OK: mock storage mode active; bucket live check skipped.");
    console.log("INFO: Set STORAGE_PROVIDER=supabase untuk mengecek bucket live.");
    return;
  }

  const baseUrl = normalizeSupabaseUrl(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"));
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const existingBuckets = await listBuckets(baseUrl, serviceRoleKey);
  const checks = REQUIRED_BUCKETS.map((bucket) => checkBucket(existingBuckets, bucket));

  for (const check of checks) {
    if (check.ok) {
      console.log(`OK: bucket reachable ${check.bucket}`);
    } else {
      console.log(`ERROR: bucket missing/unreachable ${check.bucket} reason=${check.reason}`);
    }
  }

  const missing = checks.filter((check) => !check.ok);
  if (missing.length > 0) {
    console.log(`ERROR: ${missing.length} required storage bucket(s) belum siap.`);
    process.exitCode = 1;
    return;
  }

  if (env("STORAGE_TEST_WRITE", "false") === "true") {
    await writeSmokeTest(baseUrl, serviceRoleKey, REQUIRED_BUCKETS[0]);
  } else {
    console.log("INFO: Write smoke skipped. Set STORAGE_TEST_WRITE=true untuk upload+delete test kecil.");
  }

  console.log("OK: Supabase Storage ready.");
}

async function listBuckets(baseUrl: string, serviceRoleKey: string) {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/storage/v1/bucket`, {
      method: "GET",
      headers: authHeaders(serviceRoleKey),
      cache: "no-store",
    });
  } catch {
    throw new Error("storage_network_error");
  }

  if (!response.ok) throw new Error(`storage_bucket_list_failed_${response.status}`);
  const payload = (await response.json().catch(() => [])) as Array<{
    id?: unknown;
    name?: unknown;
  }>;
  return new Set(
    payload
      .flatMap((bucket) => [bucket.id, bucket.name])
      .filter((value): value is string => typeof value === "string"),
  );
}

function checkBucket(
  existingBuckets: Set<string>,
  bucket: string,
): BucketCheck {
  return existingBuckets.has(bucket)
    ? { bucket, ok: true, reason: null }
    : { bucket, ok: false, reason: "missing_bucket" };
}

async function writeSmokeTest(
  baseUrl: string,
  serviceRoleKey: string,
  bucket: string,
) {
  const key = `storage-health-check/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.txt`;
  const objectUrl = `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${key
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
  const body = new TextEncoder().encode("ofissio-storage-health");

  const upload = await fetch(objectUrl, {
    method: "PUT",
    headers: {
      ...authHeaders(serviceRoleKey),
      "Content-Type": "text/plain",
      "x-upsert": "false",
    },
    body,
  });
  if (!upload.ok) throw new Error(`write_test_upload_failed_${upload.status}`);

  const remove = await fetch(`${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}`, {
    method: "DELETE",
    headers: {
      ...authHeaders(serviceRoleKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefixes: [key] }),
  });
  if (!remove.ok) throw new Error(`write_test_delete_failed_${remove.status}`);

  console.log("OK: write smoke uploaded and deleted one health-check object.");
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

function assertNoPublicServiceRole() {
  if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    throw new Error("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY_forbidden");
  }
}

function printHeader() {
  const title = "Ofissio Supabase Storage check";
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
