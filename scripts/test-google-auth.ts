import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET } from "../src/app/api/auth/google/route";

async function main() {
  process.env.AUTH_PROVIDER = "supabase";
  process.env.AUTH_MODE = "development";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://auth.example.test";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-server-key";
  const originalFetch = globalThis.fetch;
  let enabled = true;
  globalThis.fetch = async () => Response.json({ external: { google: enabled } });
  try {
    const response = await GET(new NextRequest("https://shop.example.test/api/auth/google?next=//evil.test"));
    assert.equal(response.status, 200);
    const payload = await response.json();
    const authorize = new URL(payload.url);
    assert.equal(authorize.origin, "https://auth.example.test");
    assert.equal(authorize.searchParams.get("provider"), "google");
    assert.equal(authorize.searchParams.get("code_challenge_method"), "s256");
    assert.equal(authorize.searchParams.get("code_challenge")?.length, 43);
    const cookie = response.cookies.get("ofissio_google_flow")!;
    const flow = JSON.parse(cookie.value);
    assert.equal(flow.next, "/dashboard");
    assert.match(response.headers.get("set-cookie")!, /HttpOnly/);
    assert.match(response.headers.get("set-cookie")!, /Secure/);
    const callback = new URL(authorize.searchParams.get("redirect_to")!);
    callback.searchParams.set("code", "fake-code");
    callback.searchParams.set("flow", "wrong-state");
    const rejected = await GET(new NextRequest(callback, { headers: { cookie: `ofissio_google_flow=${encodeURIComponent(cookie.value)}` } }));
    assert.equal(new URL(rejected.headers.get("location")!).searchParams.get("error"), "google-failed");
    const missing = await GET(new NextRequest("https://shop.example.test/api/auth/google?callback=1&code=unsolicited"));
    assert.match(missing.headers.get("location")!, /google-failed/);
    enabled = false;
    const unavailable = await GET(new NextRequest("https://shop.example.test/api/auth/google"));
    assert.equal(unavailable.status, 503);
    enabled = true;
    const previousNodeEnv = process.env.NODE_ENV;
    const previousAppUrl = process.env.APP_URL;
    try {
      Object.assign(process.env, { NODE_ENV: "production", APP_URL: "https://ofissio.com" });
      const proxied = await GET(new NextRequest("http://localhost:8000/api/auth/google?next=%2Fcheckout"));
      assert.equal(proxied.status, 200);
      const target = new URL((await proxied.json()).url);
      assert.equal(new URL(target.searchParams.get("redirect_to")!).origin, "https://ofissio.com");
      assert.match(proxied.headers.get("set-cookie")!, /Secure/);
      const failed = await GET(new NextRequest("http://localhost:8000/api/auth/google?callback=1&code=unsolicited"));
      assert.equal(new URL(failed.headers.get("location")!).origin, "https://ofissio.com");
    } finally {
      if (previousNodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
      else Object.assign(process.env, { NODE_ENV: previousNodeEnv });
      if (previousAppUrl === undefined) delete process.env.APP_URL;
      else process.env.APP_URL = previousAppUrl;
    }
    console.log("Google OAuth: PKCE, safe redirects, cookies, invalid callbacks and unavailable provider passed.");
  } finally {
    globalThis.fetch = originalFetch;
  }
}
void main();
