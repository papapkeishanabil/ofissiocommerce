import assert from "node:assert/strict";
import type { AuthSession } from "../src/features/auth/auth.types";
async function main() {
  process.env.AUTH_PROVIDER = "mock"; process.env.DATABASE_PROVIDER = "supabase";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://material-test.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service"; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon";
  const { mockAuthProvider } = await import("../src/features/auth/mock-auth.provider");
  const originalSession = mockAuthProvider.getCurrentSession; const originalFetch = globalThis.fetch;
  let session: AuthSession | null = null; let shared = false; let materialReads = 0;
  mockAuthProvider.getCurrentSession = () => session;
  const cid = "11111111-1111-4111-8111-111111111111", id = "22222222-2222-4222-8222-222222222222";
  globalThis.fetch = async (request) => {
    const url = new URL(String(request)); assert.equal(url.hostname, "material-test.invalid");
    const table = url.pathname.split("/").at(-1);
    if (table === "ofistant_conversations") return Response.json([{ user_id: "customer-a", company_id: "company-a" }]);
    if (table === "ofistant_support_sessions") return Response.json([{ customer_name: "Deny" }]);
    if (table === "ofistant_support_messages") { assert.equal(url.searchParams.get("conversation_id"), `eq.${cid}`); assert.equal(url.searchParams.get("attachment->>resourceId"), `eq.${id}`); return Response.json(shared ? [{ id: "sent" }] : []); }
    if (table === "ofistant_materials") { materialReads++; return Response.json([{ kind: "chart", data: { name: "Verified chart", rows: [{ size: "M", chest: 100, length: 70 }] } }]); }
    throw new Error(`Unexpected network: ${table}`);
  };
  try {
    const { GET } = await import("../src/app/api/ofistant/support/material/route");
    const request = () => new Request(`https://ofissio.test/api/ofistant/support/material?id=${id}&conversationId=${cid}`);
    assert.equal((await GET(request())).status, 401);
    session = { userId: "other", companyId: "company-a" } as AuthSession;
    assert.equal((await GET(request())).status, 404);
    session = { userId: "customer-a", companyId: "other" } as AuthSession;
    assert.equal((await GET(request())).status, 404);
    session = { userId: "customer-a", companyId: "company-a" } as AuthSession;
    assert.equal((await GET(request())).status, 404, "An unshared resource must remain private"); assert.equal(materialReads, 0);
    shared = true; const response = await GET(request()); assert.equal(response.status, 200); assert.equal(response.headers.get("Content-Type"), "image/png");
    assert((await response.arrayBuffer()).byteLength > 100); assert.equal(materialReads, 1);
    console.log("PASS: unauthenticated, cross-customer, cross-company and unshared materials denied; shared chart renders PNG");
  } finally { globalThis.fetch = originalFetch; mockAuthProvider.getCurrentSession = originalSession; }
}
void main();
