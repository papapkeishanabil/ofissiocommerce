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
) {
  const common = {
    httpOnly: true,
    secure: production,
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

export function clearAuthResponseCookies(response: NextResponse) {
  response.cookies.set(AUTH_ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(AUTH_REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
}
