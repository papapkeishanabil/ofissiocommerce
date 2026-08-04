export const AUTH_ACCESS_COOKIE = "ofissio_access_token";
export const AUTH_REFRESH_COOKIE = "ofissio_refresh_token";

export const TRUSTED_AUTH_HEADER = "x-ofissio-auth-verified";
export const TRUSTED_AUTH_KIND_HEADER = "x-ofissio-auth-kind";

export const UNTRUSTED_IDENTITY_HEADERS = [
  TRUSTED_AUTH_HEADER,
  TRUSTED_AUTH_KIND_HEADER,
  "x-ofissio-user-id",
  "x-ofissio-user-email",
  "x-ofissio-user-name",
  "x-ofissio-company-id",
  "x-ofissio-company-name",
  "x-ofissio-role",
  "x-ofissio-internal-role",
  "x-ofissio-internal-user-id",
  "x-ofissio-internal-user-name",
] as const;

export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
