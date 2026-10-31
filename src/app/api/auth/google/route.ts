import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthRuntimeConfig } from "@/features/auth/auth.config";
import { setAuthResponseCookies } from "@/features/auth/auth-cookie.response";
import { quotationIdFromNextPath } from "@/features/auth/auth-navigation";
import { exchangeGoogleCode } from "@/features/auth/supabase-auth.service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";
const cookieName = "ofissio_google_flow";

function safeNext(value: string | null, origin: string) {
  if (!value?.startsWith("/") || /[\\\r\n]/.test(value)) return "/dashboard";
  const url = new URL(value, origin);
  return url.origin === origin ? url.pathname + url.search : "/dashboard";
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const origin = process.env.NODE_ENV === "production" && process.env.APP_URL
    ? new URL(process.env.APP_URL).origin
    : url.origin;
  const callback = url.searchParams.get("callback") === "1";
  try {
    rateLimitOrThrow({ key: createRateLimitKey(request, "auth.google"), limit: 15, windowMs: 60_000 });
    const config = getAuthRuntimeConfig();
    if (config.provider !== "supabase" || !config.supabase.isConfigured) {
      return NextResponse.json({ message: "Pendaftaran Google belum tersedia. Silakan gunakan email untuk sementara." }, { status: 503 });
    }
    if (callback) {
      const stored = request.cookies.get(cookieName)?.value;
      if (!stored || url.searchParams.has("error")) throw new Error("OAuth rejected");
      const flow = JSON.parse(stored) as { verifier: string; next: string; state: string; expires: number };
      const code = url.searchParams.get("code");
      if (!code || flow.expires < Date.now() || flow.state !== url.searchParams.get("flow")) throw new Error("Invalid flow");
      const next = safeNext(flow.next, origin);
      const result = await exchangeGoogleCode(code, flow.verifier, quotationIdFromNextPath(next) ?? undefined);
      const response = NextResponse.redirect(new URL(next, origin));
      setAuthResponseCookies(response, result.tokens, config.mode === "production", new Request(origin));
      response.cookies.set(cookieName, "", { path: "/api/auth/google", maxAge: 0 });
      response.headers.set("Cache-Control", "no-store");
      response.headers.set("Referrer-Policy", "no-referrer");
      return response;
    }
    const settings = await fetch(`${config.supabase.url}/auth/v1/settings`, {
      headers: { apikey: config.supabase.anonKey }, cache: "no-store", signal: AbortSignal.timeout(10_000),
    });
    const providers = settings.ok ? await settings.json() : null;
    if (!providers?.external?.google) {
      return NextResponse.json({ message: "Daftar dengan Google belum diaktifkan. Silakan gunakan email untuk sementara." }, { status: 503 });
    }
    const verifier = randomBytes(32).toString("base64url");
    const state = randomBytes(24).toString("base64url");
    const redirect = new URL("/api/auth/google?callback=1", origin);
    redirect.searchParams.set("flow", state);
    const authorize = new URL(`${config.supabase.url}/auth/v1/authorize`);
    authorize.searchParams.set("provider", "google");
    authorize.searchParams.set("redirect_to", redirect.toString());
    authorize.searchParams.set("code_challenge", createHash("sha256").update(verifier).digest("base64url"));
    authorize.searchParams.set("code_challenge_method", "s256");
    const response = NextResponse.json({ url: authorize.toString() });
    response.cookies.set(cookieName, JSON.stringify({ verifier, state, next: safeNext(url.searchParams.get("next"), origin), expires: Date.now() + 600_000 }), {
      httpOnly: true, secure: new URL(origin).protocol === "https:", sameSite: "lax", path: "/api/auth/google", maxAge: 600,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (callback) {
      const response = NextResponse.redirect(new URL("/login?error=google-failed", origin));
      response.cookies.set(cookieName, "", { path: "/api/auth/google", maxAge: 0 });
      return response;
    }
    return safeErrorResponse(error, "Google belum dapat dihubungi. Silakan coba lagi atau daftar dengan email.", 503);
  }
}
