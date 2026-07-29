import "server-only";

import type { AuthSession } from "./auth.types";
import { getAuthRuntimeConfig } from "./auth.config";

export function getSessionCookieName() {
  return getAuthRuntimeConfig().sessionCookieName;
}

export function readSessionCookie(request?: Request) {
  const cookie = request?.headers.get("cookie") ?? "";
  const name = `${getSessionCookieName()}=`;
  return (
    cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(name))
      ?.slice(name.length) ?? null
  );
}

export function toSessionHeaders(session: AuthSession) {
  return {
    "x-ofissio-user-id": session.userId,
    "x-ofissio-company-id": session.companyId,
    "x-ofissio-role": session.role,
  };
}
