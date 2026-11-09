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
import { MANAGED_ROLE_OPTIONS } from "./admin-user.types";

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
  actorId: string;
  name?: string;
  role?: ManagedInternalRole;
  status?: Exclude<InternalUserStatus, "invited">;
}) {
  const client = requireClient();
  const current = await client.select<ProfileRow>("internal_user_profiles", {
    filters: { id: input.id },
    limit: 1,
  });
  if (!current[0]) throw createApiError("NOT_FOUND", "User internal tidak ditemukan.", 404);
  if (input.role || input.status) {
    assertManagedTarget(current[0]);
    assertNotSelf(current[0], input.actorId);
  }
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.role) patch.role = input.role;
  if (input.status) patch.status = input.status;
  const rows = await client.update<ProfileRow>("internal_user_profiles", patch, { id: input.id });
  if (!rows[0]) throw createApiError("NOT_FOUND", "User internal tidak ditemukan.", 404);
  return mapProfile(rows[0]);
}

export async function changeManagedInternalUserPassword(input: { id: string; actorId: string; password: string }) {
  const profile = await getManagedProfile(input.id);
  if (profile.role === "super_admin" && !isSelf(profile, input.actorId)) {
    throw createApiError("FORBIDDEN", "Password Super Admin hanya dapat diubah oleh pemilik akun tersebut.", 403);
  }
  const response = await supabaseAuthAdminFetch(`/users/${encodeURIComponent(String(profile.auth_user_id))}`, {
    method: "PUT", body: JSON.stringify({ password: input.password }),
  });
  if (!response.ok) throw createApiError("PROVIDER_ERROR", "Password belum berhasil diperbarui. Coba kembali.", 502);
}

export async function deleteManagedInternalUser(input: { id: string; actorId: string; confirmEmail: string }) {
  const client = requireClient();
  const profile = await getManagedProfile(input.id);
  assertManagedTarget(profile);
  assertNotSelf(profile, input.actorId);
  if (String(profile.email).toLowerCase() !== input.confirmEmail.trim().toLowerCase()) {
    throw createApiError("BAD_REQUEST", "Email konfirmasi tidak sesuai dengan user yang dipilih.", 400);
  }
  const authId = String(profile.auth_user_id);
  // A login that also belongs to a customer must not be removed from this screen.
  const [customers, memberships] = await Promise.all([
    client.select("user_profiles", { filters: { auth_user_id: authId }, limit: 1 }),
    client.select("company_memberships", { filters: { auth_user_id: authId }, limit: 1 }),
  ]);
  if (customers.length || memberships.length) {
    throw createApiError("FORBIDDEN", "Akun ini juga terhubung dengan customer. Gunakan Nonaktifkan untuk mencabut akses internal.", 409);
  }
  const filters = { id: input.id, auth_user_id: authId, role: String(profile.role) };
  const rows = await client.update("internal_user_profiles", { status: "inactive", updated_at: new Date().toISOString() }, filters);
  if (!rows.length) throw createApiError("BAD_REQUEST", "Data user berubah. Muat ulang daftar sebelum menghapus.", 409);
  // Retain the auth identity for historical references; do not cascade-delete business records.
  const response = await supabaseAuthAdminFetch(`/users/${encodeURIComponent(authId)}`, {
    method: "DELETE", body: JSON.stringify({ should_soft_delete: true }),
  });
  if (!response.ok && response.status !== 404) {
    throw createApiError("PROVIDER_ERROR", "Akses internal sudah dinonaktifkan, tetapi akun login belum berhasil dihapus. Coba hapus kembali.", 502);
  }
  const removed = await client.delete("internal_user_profiles", { ...filters, status: "inactive" });
  if (!removed.length) throw createApiError("BAD_REQUEST", "Akun login sudah dihapus, tetapi data profil berubah. Muat ulang daftar dan coba hapus kembali.", 409);
  return mapProfile(profile);
}

async function getManagedProfile(id: string) {
  const rows = await requireClient().select<ProfileRow>("internal_user_profiles", { filters: { id }, limit: 1 });
  if (!rows[0]) throw createApiError("NOT_FOUND", "User internal tidak ditemukan.", 404);
  return rows[0];
}

function isSelf(profile: ProfileRow, actorId: string) {
  return profile.id === actorId || profile.auth_user_id === actorId;
}

function assertNotSelf(profile: ProfileRow, actorId: string) {
  if (isSelf(profile, actorId)) throw createApiError("FORBIDDEN", "Akun yang sedang digunakan tidak dapat dihapus, dinonaktifkan, atau diubah perannya sendiri.", 409);
}

function assertManagedTarget(profile: ProfileRow) {
  if (!MANAGED_ROLE_OPTIONS.some(option => option.value === profile.role)) {
    throw createApiError("FORBIDDEN", "Akun sistem dan Super Admin tidak dapat dihapus atau diubah peran/statusnya dari menu ini.", 403);
  }
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
  const response = await supabaseAuthAdminFetch(`/users/${encodeURIComponent(authUserId)}`, { method: "DELETE" });
  if (!response.ok) throw createApiError("PROVIDER_ERROR", "Pembersihan akun login gagal.", 502);
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
