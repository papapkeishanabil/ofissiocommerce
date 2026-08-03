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
  const sourceHostname = normalizeHostname(source.hostname);
  const baseHostname = normalizeHostname(base.hostname);
  const baseIsLocal = isLoopbackHostname(baseHostname) || baseHostname.endsWith(".local");
  if (!baseIsLocal) return false;

  return isLoopbackHostname(sourceHostname) || sourceHostname.endsWith(".local");
}

function normalizeHostname(value: string) {
  return value.toLowerCase().replace(/^\[|\]$/g, "");
}

function isLoopbackHostname(value: string) {
  return value === "localhost" || value === "127.0.0.1" || value === "::1";
}

function stripApiPath(value: string) {
  return value
    .replace(/\/wp-json\/wc\/v3\/?$/i, "")
    .replace(/\/wp-json\/wp\/v2\/?$/i, "")
    .replace(/\/+$/, "");
}
