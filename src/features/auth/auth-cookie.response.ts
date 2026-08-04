import "server-only";

import type { NextResponse } from "next/server";

import {
  AUTH_ACCESS_COOKIE,
  AUTH_COOKIE_MAX_AGE_SECONDS,
  AUTH_REFRESH_COOKIE,
} from "./auth.constants";
import type { AuthTokens } from "./supabase-auth.service";

export function setAuthResponseCookies(
  response: NextResponse,
  tokens: AuthTokens,
  production: boolean,
  request: Request,
) {
  // Cookie `Secure` hanya diberlakukan saat request lewat HTTPS. Pada akses HTTP
  // LAN (mis. http://192.168.2.4:8000) browser TIDAK menyimpan cookie Secure,
  // sehingga sesi login hilang. Deteksi protokol nyata request agar tetap aman
  // di HTTPS dan tetap berfungsi di HTTP lokal/LAN.
  const secure = production && isHttpsRequest(request);
  const common = {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
  };
  response.cookies.set(AUTH_ACCESS_COOKIE, tokens.accessToken, {
    ...common,
    maxAge: Math.max(tokens.expiresIn, 60),
  });
  response.cookies.set(AUTH_REFRESH_COOKIE, tokens.refreshToken, {
    ...common,
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  });
}

function isHttpsRequest(request: Request) {
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

export function clearAuthResponseCookies(response: NextResponse) {
  response.cookies.set(AUTH_ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(AUTH_REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
}
