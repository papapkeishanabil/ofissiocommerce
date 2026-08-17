import { randomUUID } from "node:crypto";

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const email = required("SUPERADMIN_EMAIL").toLowerCase();
const password = required("SUPERADMIN_INITIAL_PASSWORD");
const name = process.env.SUPERADMIN_NAME?.trim() || "Super Admin Ofissio";
const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL").replace(/\/+$/, "");
const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY");

if (password.length < 8) {
  throw new Error("SUPERADMIN_INITIAL_PASSWORD minimal 8 karakter.");
}

type Profile = {
  id: string;
  auth_user_id: string;
  email: string;
  role: string;
  status: string;
};

async function main() {
  const profiles = await rest<Profile[]>(
    `/rest/v1/internal_user_profiles?select=id,auth_user_id,email,role,status&email=eq.${encodeURIComponent(email)}&limit=1`,
  );
  const existing = profiles[0];

  if (existing) {
    if (existing.role !== "super_admin" || existing.status !== "active") {
      throw new Error(
        "Email sudah terdaftar, tetapi bukan super_admin aktif. Proses dihentikan agar role tidak berubah diam-diam.",
      );
    }
    console.log(`OK: ${email} sudah terdaftar sebagai super_admin aktif.`);
    return;
  }

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, account_type: "internal" },
    }),
  });
  const authPayload = (await authResponse.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    msg?: string;
  };
  if (!authResponse.ok || !authPayload.id) {
    throw new Error(authPayload.message ?? authPayload.msg ?? "Supabase Auth menolak pembuatan user.");
  }

  try {
    await rest<Profile[]>("/rest/v1/internal_user_profiles", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        id: randomUUID(),
        auth_user_id: authPayload.id,
        name,
        email,
        role: "super_admin",
        status: "active",
      }),
    });
  } catch (error) {
    await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(authPayload.id)}`, {
      method: "DELETE",
      headers: headers(),
    }).catch(() => undefined);
    throw error;
  }

  console.log(`OK: ${email} berhasil dibuat sebagai super_admin aktif.`);
  console.log("NEXT: login dan ganti password awal, lalu aktifkan MFA sebelum mengubah role admin lama.");
}

function required(key: string) {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} belum diisi.`);
  return value;
}

function headers(extra: Record<string, string> = {}) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function rest<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: headers(init.headers as Record<string, string> | undefined),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload && typeof payload === "object" && "message" in payload
      ? String(payload.message)
      : `status ${response.status}`;
    throw new Error(`Supabase gagal memproses provisioning: ${detail}`);
  }
  return payload as T;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Provisioning gagal.");
  process.exitCode = 1;
});
