import "server-only";

import { randomUUID } from "node:crypto";

import type { AuthSession } from "@/features/auth/auth.types";
import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import { logAuditEvent } from "@/lib/security/audit-log";
import { createApiError } from "@/lib/security/safe-error-response";

import type {
  CustomerAddress,
  CustomerAddressInput,
  CustomerCompanyProfileInput,
} from "./customer-account.types";

const PROFILE_WRITE_ROLES = new Set([
  "customer_admin",
  "company_admin",
]);
const ADDRESS_WRITE_ROLES = new Set([
  "customer_admin",
  "customer_user",
  "company_admin",
  "purchasing",
]);

function requiredClient() {
  const client = getSupabaseAdminClient();
  if (!client) {
    throw createApiError(
      "PROVIDER_UNAVAILABLE",
      "Penyimpanan profil perusahaan belum tersedia.",
      503,
    );
  }
  return client;
}

function requireProfileWrite(session: AuthSession) {
  if (!PROFILE_WRITE_ROLES.has(session.role)) {
    throw createApiError(
      "FORBIDDEN",
      "Role Anda hanya dapat melihat profil perusahaan.",
      403,
    );
  }
}

function requireAddressWrite(session: AuthSession) {
  if (!ADDRESS_WRITE_ROLES.has(session.role)) {
    throw createApiError(
      "FORBIDDEN",
      "Role Anda tidak dapat mengubah alamat perusahaan.",
      403,
    );
  }
}

export async function updateCustomerCompanyProfile(input: {
  session: AuthSession;
  profile: CustomerCompanyProfileInput;
  request?: Request;
}) {
  requireProfileWrite(input.session);
  const client = requiredClient();
  const now = new Date().toISOString();
  const rows = await client.update("companies", {
    name: input.profile.companyName.trim(),
    industry: input.profile.industry.trim(),
    employee_count: input.profile.employeeCount,
    npwp: input.profile.npwp?.trim() || null,
    phone: input.profile.phone.trim(),
    pic_name: input.profile.picName.trim(),
    pic_email: input.profile.picEmail.trim().toLowerCase(),
    pic_whatsapp: input.profile.picWhatsapp.trim(),
    profile_completed_at: now,
    updated_at: now,
  }, { id: input.session.companyId });
  if (!rows[0]) {
    throw createApiError("NOT_FOUND", "Perusahaan tidak ditemukan.", 404);
  }
  logAuditEvent({
    request: input.request,
    actorId: input.session.userId,
    actorType: "customer",
    companyId: input.session.companyId,
    action: "company_profile_updated",
    entityType: "company",
    entityId: input.session.companyId,
    metadata: { industry: input.profile.industry },
  });
  return rows[0];
}

export async function createCustomerAddress(input: {
  session: AuthSession;
  address: CustomerAddressInput;
  request?: Request;
}) {
  requireAddressWrite(input.session);
  const client = requiredClient();
  const existing = await client.select("company_addresses", {
    filters: { company_id: input.session.companyId },
    order: "created_at.asc",
  });
  const firstAddress = existing.length === 0;
  const isDefaultShipping = firstAddress || Boolean(input.address.isDefaultShipping);
  const isDefaultBilling = firstAddress || Boolean(input.address.isDefaultBilling);
  if (isDefaultShipping) {
    await client.update(
      "company_addresses",
      { is_default_shipping: false, is_default: false },
      { company_id: input.session.companyId },
    );
  }
  if (isDefaultBilling) {
    await client.update(
      "company_addresses",
      { is_default_billing: false },
      { company_id: input.session.companyId },
    );
  }
  const now = new Date().toISOString();
  const rows = await client.insert("company_addresses", {
    id: randomUUID(),
    company_id: input.session.companyId,
    ...addressInputToRow(input.address),
    is_default: isDefaultShipping,
    is_default_shipping: isDefaultShipping,
    is_default_billing: isDefaultBilling,
    created_at: now,
    updated_at: now,
  });
  const row = rows[0];
  if (!row) throw createApiError("BAD_REQUEST", "Alamat belum dapat dibuat.", 400);
  logAuditEvent({
    request: input.request,
    actorId: input.session.userId,
    actorType: "customer",
    companyId: input.session.companyId,
    action: "company_address_created",
    entityType: "company_address",
    entityId: String(row.id),
    metadata: { label: input.address.label },
  });
  return rowToAddress(row);
}

export async function updateCustomerAddress(input: {
  session: AuthSession;
  addressId: string;
  address: CustomerAddressInput;
  request?: Request;
}) {
  requireAddressWrite(input.session);
  const client = requiredClient();
  const current = await getOwnedAddress(client, input.session.companyId, input.addressId);
  if (!current) throw createApiError("NOT_FOUND", "Alamat tidak ditemukan.", 404);
  if (input.address.isDefaultShipping) {
    await client.update(
      "company_addresses",
      { is_default_shipping: false, is_default: false },
      { company_id: input.session.companyId },
    );
  }
  if (input.address.isDefaultBilling) {
    await client.update(
      "company_addresses",
      { is_default_billing: false },
      { company_id: input.session.companyId },
    );
  }
  const rows = await client.update("company_addresses", {
    ...addressInputToRow(input.address),
    is_default: Boolean(input.address.isDefaultShipping),
    is_default_shipping: Boolean(input.address.isDefaultShipping),
    is_default_billing: Boolean(input.address.isDefaultBilling),
    updated_at: new Date().toISOString(),
  }, { id: input.addressId, company_id: input.session.companyId });
  const row = rows[0];
  if (!row) throw createApiError("NOT_FOUND", "Alamat tidak ditemukan.", 404);
  await ensureAddressDefaults(client, input.session.companyId, input.addressId);
  logAuditEvent({
    request: input.request,
    actorId: input.session.userId,
    actorType: "customer",
    companyId: input.session.companyId,
    action: "company_address_updated",
    entityType: "company_address",
    entityId: input.addressId,
    metadata: { label: input.address.label },
  });
  return rowToAddress(row);
}

export async function deleteCustomerAddress(input: {
  session: AuthSession;
  addressId: string;
  request?: Request;
}) {
  requireAddressWrite(input.session);
  const client = requiredClient();
  const current = await getOwnedAddress(client, input.session.companyId, input.addressId);
  if (!current) throw createApiError("NOT_FOUND", "Alamat tidak ditemukan.", 404);
  await client.delete("company_addresses", {
    id: input.addressId,
    company_id: input.session.companyId,
  });
  const remaining = await client.select("company_addresses", {
    filters: { company_id: input.session.companyId },
    order: "created_at.asc",
  });
  const first = remaining[0];
  if (first) {
    const patch: Record<string, unknown> = {};
    if (Boolean(current.is_default_shipping) && !remaining.some((row) => Boolean(row.is_default_shipping))) {
      patch.is_default_shipping = true;
      patch.is_default = true;
    }
    if (Boolean(current.is_default_billing) && !remaining.some((row) => Boolean(row.is_default_billing))) {
      patch.is_default_billing = true;
    }
    if (Object.keys(patch).length > 0) {
      patch.updated_at = new Date().toISOString();
      await client.update("company_addresses", patch, {
        id: String(first.id),
        company_id: input.session.companyId,
      });
    }
  }
  logAuditEvent({
    request: input.request,
    actorId: input.session.userId,
    actorType: "customer",
    companyId: input.session.companyId,
    action: "company_address_deleted",
    entityType: "company_address",
    entityId: input.addressId,
    metadata: {},
  });
  return true;
}

function addressInputToRow(address: CustomerAddressInput) {
  return {
    label: address.label.trim(),
    recipient_name: address.recipientName.trim(),
    phone: address.recipientPhone.trim(),
    address_line: address.street.trim(),
    city: address.city.trim(),
    province: address.province.trim(),
    postal_code: address.postalCode.trim(),
  };
}

function rowToAddress(row: Record<string, unknown>): CustomerAddress {
  return {
    id: String(row.id),
    label: String(row.label ?? "Alamat"),
    recipientName: String(row.recipient_name ?? ""),
    recipientPhone: String(row.phone ?? ""),
    street: String(row.address_line ?? ""),
    city: String(row.city ?? ""),
    province: String(row.province ?? ""),
    postalCode: String(row.postal_code ?? ""),
    isDefaultShipping: Boolean(row.is_default_shipping ?? row.is_default),
    isDefaultBilling: Boolean(row.is_default_billing ?? row.is_default),
  };
}

async function getOwnedAddress(
  client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  companyId: string,
  addressId: string,
) {
  const rows = await client.select("company_addresses", {
    filters: { id: addressId, company_id: companyId },
    limit: 1,
  });
  return rows[0] ?? null;
}

async function ensureAddressDefaults(
  client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  companyId: string,
  preferredAddressId: string,
) {
  const rows = await client.select("company_addresses", {
    filters: { company_id: companyId },
    order: "created_at.asc",
  });
  const fallback = rows.find((row) => String(row.id) === preferredAddressId) ?? rows[0];
  if (!fallback) return;
  const patch: Record<string, unknown> = {};
  if (!rows.some((row) => Boolean(row.is_default_shipping))) {
    patch.is_default_shipping = true;
    patch.is_default = true;
  }
  if (!rows.some((row) => Boolean(row.is_default_billing))) {
    patch.is_default_billing = true;
  }
  if (Object.keys(patch).length > 0) {
    patch.updated_at = new Date().toISOString();
    await client.update("company_addresses", patch, {
      id: String(fallback.id),
      company_id: companyId,
    });
  }
}
