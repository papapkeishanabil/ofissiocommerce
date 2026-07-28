import "server-only";

export function assertServerOnlySecret(name: string) {
  if (typeof window !== "undefined") {
    throw new Error(`${name} must only be read on the server.`);
  }
  if (name.startsWith("NEXT_PUBLIC_")) {
    throw new Error(`${name} is public and must not be used for server secrets.`);
  }
}

export function getRequiredServerEnv(name: string) {
  assertServerOnlySecret(name);
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required server env ${name}.`);
  return value;
}

export function getOptionalServerEnv(name: string, fallback = "") {
  assertServerOnlySecret(name);
  return process.env[name]?.trim() || fallback;
}

export function redactSecret(value: string | null | undefined) {
  if (!value) return "";
  if (value.length <= 6) return "[redacted]";
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

export function assertNoPublicSecretEnv(names: string[]) {
  names.forEach((name) => {
    if (name.startsWith("NEXT_PUBLIC_") && process.env[name]) {
      throw new Error(`${name} must not be exposed as a public env variable.`);
    }
  });
}
