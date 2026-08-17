import "server-only";

import { randomUUID } from "node:crypto";

import { getDatabaseRuntimeConfig } from "@/features/database/database.config";
import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import { createApiError } from "@/lib/security/safe-error-response";

import type {
  InternalUserStatus,
  ManagedInternalRole,
  ManagedInternalUser,
} from "./admin-user.types";

type ProfileRow = Record<string, unknown>;

export async function listManagedInternalUsers(): Promise<ManagedInternalUser[]> {
  const client = requireClient();
  const rows = await client.select<ProfileRow>("internal_user_profiles", {
    order: "created_at.desc",
  });
  return rows.map(mapProfile);
}

export async function createManagedInternalUser(input: {
  name: string;
  email: string;
  password: string;
  role: ManagedInternalRole;
}) {
  const client = requireClient();
  const email = input.email.trim().toLowerCase();
  const existing = await client.select<ProfileRow>("internal_user_profiles", {
    filters: { email },
    limit: 1,
  });
  if (existing.length) throw createApiError("BAD_REQUEST", "Email sudah terdaftar sebagai user internal.", 409);

  const authUser = await createSupabaseAuthUser({
    email,
    password: input.password,
    name: input.name.trim(),
  });
  const id = randomUUID();
  try {
    const rows = await client.insert<ProfileRow>("internal_user_profiles", {
      id,
      auth_user_id: authUser.id,
      name: input.name.trim(),
      email,
      role: input.role,
      status: "active",
    });
    return mapProfile(rows[0] ?? {
      id,
      auth_user_id: authUser.id,
      name: input.name.trim(),
      email,
      role: input.role,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    await deleteSupabaseAuthUser(authUser.id).catch(() => undefined);
    throw error;
  }
}

export async function updateManagedInternalUser(input: {
  id: string;
  role?: ManagedInternalRole;
  status?: Exclude<InternalUserStatus, "invited">;
}) {
  const client = requireClient();
  const current = await client.select<ProfileRow>("internal_user_profiles", {
    filters: { id: input.id },
    limit: 1,
  });
  if (!current[0]) throw createApiError("NOT_FOUND", "User internal tidak ditemukan.", 404);
  if (String(current[0].role) === "super_admin") {
    throw createApiError("FORBIDDEN", "Role super admin tidak dapat diubah dari menu ini.", 403);
  }
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.role) patch.role = input.role;
  if (input.status) patch.status = input.status;
  const rows = await client.update<ProfileRow>("internal_user_profiles", patch, { id: input.id });
  return mapProfile(rows[0] ?? { ...current[0], ...patch });
}

function requireClient() {
  const client = getSupabaseAdminClient();
  if (!client) throw createApiError("PROVIDER_UNAVAILABLE", "Supabase Admin belum dikonfigurasi.", 503);
  return client;
}

async function createSupabaseAuthUser(input: { email: string; password: string; name: string }) {
  const response = await supabaseAuthAdminFetch("/users", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.name, account_type: "internal" },
    }),
  });
  const payload = await response.json().catch(() => ({})) as { id?: string; message?: string; msg?: string };
  if (!response.ok || !payload.id) {
    throw createApiError("BAD_REQUEST", payload.message ?? payload.msg ?? "Akun login internal belum dapat dibuat.", response.status || 400);
  }
  return { id: payload.id };
}

async function deleteSupabaseAuthUser(authUserId: string) {
  await supabaseAuthAdminFetch(`/users/${encodeURIComponent(authUserId)}`, { method: "DELETE" });
}

function supabaseAuthAdminFetch(path: string, init: RequestInit) {
  const config = getDatabaseRuntimeConfig();
  if (config.provider !== "supabase" || !config.supabase.isConfigured) {
    throw createApiError("PROVIDER_UNAVAILABLE", "Supabase Auth Admin belum dikonfigurasi.", 503);
  }
  const baseUrl = config.supabase.url.replace(/\/+$/, "");
  const key = config.supabase.serviceRoleKey;
  return fetch(`${baseUrl}/auth/v1/admin${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
}

function mapProfile(row: ProfileRow): ManagedInternalUser {
  return {
    id: String(row.id),
    authUserId: String(row.auth_user_id),
    name: String(row.name ?? "User Ofissio"),
    email: String(row.email ?? ""),
    role: String(row.role ?? "support") as ManagedInternalUser["role"],
    status: String(row.status ?? "inactive") as InternalUserStatus,
    lastLoginAt: typeof row.last_login_at === "string" ? row.last_login_at : null,
    createdAt: String(row.created_at ?? new Date(0).toISOString()),
    updatedAt: String(row.updated_at ?? row.created_at ?? new Date(0).toISOString()),
  };
}
