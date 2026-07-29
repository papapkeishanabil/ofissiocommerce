import "server-only";

import { logInternalError } from "@/lib/security/safe-error-response";

import { getDatabaseRuntimeConfig } from "./database.config";
import { DatabaseConfigurationError, DatabaseQueryError } from "./database.errors";
import type { SupabaseQueryOptions } from "./database.types";

type SupabaseRow = Record<string, unknown>;

function supabaseRestUrl(path: string) {
  const config = getDatabaseRuntimeConfig();
  if (config.provider !== "supabase" || !config.supabase.isConfigured) {
    throw new DatabaseConfigurationError("Supabase database env belum lengkap.");
  }
  const baseUrl = config.supabase.url.replace(/\/+$/, "");
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
  if (options.limit) params.set("limit", String(options.limit));
  for (const [key, value] of Object.entries(options.filters ?? {})) {
    if (value === null) {
      params.set(key, "is.null");
    } else {
      params.set(key, `eq.${String(value)}`);
    }
  }
  return params.toString();
}

async function parseRows<T>(response: Response): Promise<T[]> {
  if (!response.ok) {
    const safeStatus = response.status;
    const body = await response.text().catch(() => "");
    logInternalError(new Error(`Supabase query failed ${safeStatus}`), {
      body: body.slice(0, 160),
      status: safeStatus,
    });
    throw new DatabaseQueryError("Database Supabase belum dapat memproses request.");
  }
  if (response.status === 204) return [];
  const payload = (await response.json().catch(() => [])) as T[] | T;
  return Array.isArray(payload) ? payload : [payload];
}

export function getSupabaseAdminClient() {
  const config = getDatabaseRuntimeConfig();
  if (config.provider !== "supabase" || !config.supabase.isConfigured) {
    return null;
  }

  return {
    async healthCheck() {
      const { url } = supabaseRestUrl(`companies?${buildQuery({ select: "id", limit: 1 })}`);
      const response = await fetch(url, {
        method: "GET",
        headers: headers(),
        cache: "no-store",
      });
      await parseRows<SupabaseRow>(response);
      return true;
    },

    async select<T extends SupabaseRow>(
      table: string,
      options: SupabaseQueryOptions = {},
    ) {
      const { url } = supabaseRestUrl(`${table}?${buildQuery(options)}`);
      const response = await fetch(url, {
        method: "GET",
        headers: headers(),
        cache: "no-store",
      });
      return parseRows<T>(response);
    },

    async insert<T extends SupabaseRow>(
      table: string,
      rows: SupabaseRow | SupabaseRow[],
    ) {
      const { url } = supabaseRestUrl(table);
      const response = await fetch(url, {
        method: "POST",
        headers: headers("return=representation"),
        body: JSON.stringify(Array.isArray(rows) ? rows : [rows]),
      });
      return parseRows<T>(response);
    },

    async update<T extends SupabaseRow>(
      table: string,
      patch: SupabaseRow,
      filters: NonNullable<SupabaseQueryOptions["filters"]>,
    ) {
      const { url } = supabaseRestUrl(
        `${table}?${buildQuery({ filters })}`,
      );
      const response = await fetch(url, {
        method: "PATCH",
        headers: headers("return=representation"),
        body: JSON.stringify(patch),
      });
      return parseRows<T>(response);
    },
  };
}
