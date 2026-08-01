export function normalizeWooCommerceMediaUrl(
  value: string,
  configuredBaseUrl: string,
) {
  const sourceValue = value.trim();
  const baseValue = configuredBaseUrl.trim();
  if (!sourceValue || !baseValue) return sourceValue;

  try {
    const source = new URL(sourceValue);
    const base = new URL(stripApiPath(baseValue));
    if (!isInternalLocalOrigin(source, base)) return sourceValue;

    source.protocol = base.protocol;
    source.hostname = base.hostname;
    // URL.host assignment keeps the old explicit port when the new host has
    // no port. Set port separately so :10010 cannot leak to browser URLs.
    source.port = base.port;
    source.username = "";
    source.password = "";
    return source.toString();
  } catch {
    return sourceValue;
  }
}

function isInternalLocalOrigin(source: URL, base: URL) {
  if (source.origin === base.origin) return false;
  const hostname = source.hostname.toLowerCase();
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") {
    return true;
  }
  return Boolean(source.port && hostname.endsWith(".local"));
}

function stripApiPath(value: string) {
  return value
    .replace(/\/wp-json\/wc\/v3\/?$/i, "")
    .replace(/\/wp-json\/wp\/v2\/?$/i, "")
    .replace(/\/+$/, "");
}
