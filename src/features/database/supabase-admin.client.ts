import "server-only";

import { logInternalError } from "@/lib/security/safe-error-response";

import { getDatabaseRuntimeConfig } from "./database.config";
import { DatabaseConfigurationError, SupabaseDatabaseError } from "./database.errors";
import type { SupabaseQueryOptions } from "./database.types";

type SupabaseRow = Record<string, unknown>;
type PostgrestErrorPayload = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function supabaseRestUrl(path: string) {
  const config = getDatabaseRuntimeConfig();
  if (config.provider !== "supabase" || !config.supabase.isConfigured) {
    throw new DatabaseConfigurationError("Supabase database env belum lengkap.");
  }
  const baseUrl = config.supabase.url.replace(/\/+$/, "");
  assertValidSupabaseUrl(baseUrl);
  assertServiceRoleKey(config.supabase.serviceRoleKey);

  return {
    url: `${baseUrl}/rest/v1/${path}`,
    serviceRoleKey: config.supabase.serviceRoleKey,
  };
}

function headers(prefer?: string) {
  const { serviceRoleKey } = supabaseRestUrl("");
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

function buildQuery(options: SupabaseQueryOptions = {}) {
  const params = new URLSearchParams();
  params.set("select", options.select ?? "*");
  if (options.order) params.set("order", options.order);
  if (options.limit !== undefined) params.set("limit", String(options.limit));
  for (const [key, value] of Object.entries(options.filters ?? {})) {
    if (value === null) {
      params.set(key, "is.null");
    } else {
      params.set(key, `eq.${String(value)}`);
    }
  }
  return params.toString();
}

function assertSafeTableName(table: string) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(table)) {
    throw new SupabaseDatabaseError({
      reason: "query_error",
      message: "Nama tabel Supabase tidak valid.",
      table,
    });
  }
}

function assertValidSupabaseUrl(baseUrl: string) {
  try {
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
      throw new Error("Supabase URL must use HTTPS.");
    }
  } catch {
    throw new SupabaseDatabaseError({
      reason: "invalid_url",
      message: "Supabase URL tidak valid.",
    });
  }
}

function assertServiceRoleKey(key: string) {
  const role = decodeJwtRole(key);
  if (role && role !== "service_role") {
    throw new SupabaseDatabaseError({
      reason: "invalid_key",
      message: "Supabase service role key tidak valid.",
    });
  }
}

function decodeJwtRole(key: string) {
  const [, payload] = key.split(".");
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      Math.ceil(normalized.length / 4) * 4,
      "=",
    );
    const decoded = JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as {
      role?: unknown;
    };
    return typeof decoded.role === "string" ? decoded.role : null;
  } catch {
    return null;
  }
}

function classifySupabaseError(
  response: Response,
  payload: PostgrestErrorPayload | null,
) {
  const message = `${payload?.code ?? ""} ${payload?.message ?? ""} ${
    payload?.details ?? ""
  } ${payload?.hint ?? ""}`.toLowerCase();

  if (
    response.status === 401 ||
    message.includes("invalid api key") ||
    message.includes("invalid jwt") ||
    message.includes("jwt expired") ||
    message.includes("jwserror")
  ) {
    return "invalid_key" as const;
  }

  if (
    payload?.code === "42P01" ||
    payload?.code === "PGRST205" ||
    message.includes("relation") && message.includes("does not exist") ||
    message.includes("could not find the table")
  ) {
    return "relation_does_not_exist" as const;
  }

  if (message.includes("row-level security")) {
    return "rls_denied" as const;
  }

  if (
    response.status === 403 ||
    payload?.code === "42501" ||
    message.includes("permission denied")
  ) {
    return "permission_denied" as const;
  }

  return "query_error" as const;
}

async function parseErrorPayload(response: Response) {
  const text = await response.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text) as PostgrestErrorPayload;
  } catch {
    return { message: text.slice(0, 120) };
  }
}

async function parseRows<T>(
  response: Response,
  context: { table?: string; operation: string },
): Promise<T[]> {
  if (!response.ok) {
    const payload = await parseErrorPayload(response);
    const reason = classifySupabaseError(response, payload);
    logInternalError(new Error("Supabase query failed."), {
      area: "supabase_admin_client",
      operation: context.operation,
      table: context.table,
      reason,
      status: response.status,
      code: payload?.code,
    });
    throw new SupabaseDatabaseError({
      reason,
      status: response.status,
      code: payload?.code,
      table: context.table,
      message: "Database Supabase belum dapat memproses request.",
    });
  }
  if (response.status === 204) return [];
  const payload = (await response.json().catch(() => [])) as T[] | T;
  return Array.isArray(payload) ? payload : [payload];
}

async function fetchRows<T extends SupabaseRow>(
  table: string,
  options: SupabaseQueryOptions = {},
  operation = "select",
) {
  assertSafeTableName(table);
  const { url } = supabaseRestUrl(`${table}?${buildQuery(options)}`);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: headers(),
      cache: "no-store",
    });
  } catch (error) {
    logInternalError(error, {
      area: "supabase_admin_client",
      operation,
      table,
      reason: "network_error",
    });
    throw new SupabaseDatabaseError({
      reason: "network_error",
      table,
      message: "Database Supabase belum dapat dihubungi.",
    });
  }
  return parseRows<T>(response, { table, operation });
}

export function getSupabaseAdminClient() {
  const config = getDatabaseRuntimeConfig();
  if (config.provider !== "supabase" || !config.supabase.isConfigured) {
    return null;
  }

  return {
    async healthCheck() {
      await fetchRows("companies", { select: "id", limit: 1 }, "health_check");
      return true;
    },

    async checkSchema(tables: readonly string[]) {
      const missingTables: string[] = [];

      for (const table of tables) {
        try {
          await fetchRows(table, { select: "id", limit: 1 }, "schema_check");
        } catch (error) {
          if (
            error instanceof SupabaseDatabaseError &&
            error.reason === "relation_does_not_exist"
          ) {
            missingTables.push(table);
            continue;
          }
          throw error;
        }
      }

      return {
        ok: missingTables.length === 0,
        status: missingTables.length === 0 ? "ready" : "schema_missing",
        checkedTables: [...tables],
        missingTables,
      } as const;
    },

    async select<T extends SupabaseRow>(
      table: string,
      options: SupabaseQueryOptions = {},
    ) {
      return fetchRows<T>(table, options, "select");
    },

    async insert<T extends SupabaseRow>(
      table: string,
      rows: SupabaseRow | SupabaseRow[],
    ) {
      assertSafeTableName(table);
      const { url } = supabaseRestUrl(table);
      let response: Response;
      try {
        response = await fetch(url, {
          method: "POST",
          headers: headers("return=representation"),
          body: JSON.stringify(Array.isArray(rows) ? rows : [rows]),
        });
      } catch (error) {
        logInternalError(error, {
          area: "supabase_admin_client",
          operation: "insert",
          table,
          reason: "network_error",
        });
        throw new SupabaseDatabaseError({
          reason: "network_error",
          table,
          message: "Database Supabase belum dapat dihubungi.",
        });
      }
      return parseRows<T>(response, { table, operation: "insert" });
    },

    async update<T extends SupabaseRow>(
      table: string,
      patch: SupabaseRow,
      filters: NonNullable<SupabaseQueryOptions["filters"]>,
    ) {
      assertSafeTableName(table);
      const { url } = supabaseRestUrl(
        `${table}?${buildQuery({ filters })}`,
      );
      let response: Response;
      try {
        response = await fetch(url, {
          method: "PATCH",
          headers: headers("return=representation"),
          body: JSON.stringify(patch),
        });
      } catch (error) {
        logInternalError(error, {
          area: "supabase_admin_client",
          operation: "update",
          table,
          reason: "network_error",
        });
        throw new SupabaseDatabaseError({
          reason: "network_error",
          table,
          message: "Database Supabase belum dapat dihubungi.",
        });
      }
      return parseRows<T>(response, { table, operation: "update" });
    },

    async delete<T extends SupabaseRow>(
      table: string,
      filters: NonNullable<SupabaseQueryOptions["filters"]>,
    ) {
      assertSafeTableName(table);
      const { url } = supabaseRestUrl(
        `${table}?${buildQuery({ filters })}`,
      );
      let response: Response;
      try {
        response = await fetch(url, {
          method: "DELETE",
          headers: headers("return=representation"),
        });
      } catch (error) {
        logInternalError(error, {
          area: "supabase_admin_client",
          operation: "delete",
          table,
          reason: "network_error",
        });
        throw new SupabaseDatabaseError({
          reason: "network_error",
          table,
          message: "Database Supabase belum dapat dihubungi.",
        });
      }
      return parseRows<T>(response, { table, operation: "delete" });
    },
  };
}
