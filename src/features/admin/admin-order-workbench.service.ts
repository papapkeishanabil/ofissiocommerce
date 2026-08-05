import "server-only";

import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import type { PaymentOrderRecord } from "@/features/payment/payment.types";
import { repositoryRegistry } from "@/features/repositories/repository.factory";
import { storageService } from "@/features/storage/storage.service";
import type { CustomerTrackingOrder } from "@/features/tracking/tracking.types";

import type {
  AdminOrderAddressSnapshot,
  AdminOrderArtworkPreview,
  AdminOrderCustomerSnapshot,
} from "./admin.types";

export async function getAdminOrderCustomerSnapshot(input: {
  order: PaymentOrderRecord;
  tracking: CustomerTrackingOrder | null;
}): Promise<AdminOrderCustomerSnapshot> {
  const { order, tracking } = input;
  const company = await repositoryRegistry.company
    .getCompanyById(order.companyId)
    .catch(() => null);
  const companyRow = asRecord(company);
  const client = getSupabaseAdminClient();
  const [addressRows, userRows] = await Promise.all([
    client && isUuid(order.companyId)
      ? client
          .select("company_addresses", {
            filters: { company_id: order.companyId },
            order: "created_at.asc",
          })
          .catch(() => [])
      : Promise.resolve([]),
    client && isUuid(order.userId)
      ? client
          .select("user_profiles", {
            filters: { id: order.userId },
            limit: 1,
          })
          .catch(() => [])
      : Promise.resolve([]),
  ]);
  const addresses = addressRows.map(mapAddress);
  const user = asRecord(userRows[0]);
  const orderSnapshot = getOrderAddressSnapshot(order);

  return {
    companyId: order.companyId,
    companyName:
      text(companyRow, "name") ?? tracking?.companyName ?? order.companyId,
    legalName: text(companyRow, "legal_name", "legalName"),
    industry: text(companyRow, "industry"),
    phone: text(companyRow, "phone"),
    picName:
      text(companyRow, "pic_name", "picName") ?? text(user, "name"),
    picEmail:
      text(companyRow, "pic_email", "picEmail") ?? text(user, "email"),
    picWhatsapp:
      text(companyRow, "pic_whatsapp", "picWhatsapp") ?? text(user, "whatsapp"),
    shippingAddress:
      addresses.find((address) => address.isDefaultShipping) ??
      orderSnapshot.shippingAddress ??
      addresses[0] ??
      null,
    billingAddress:
      addresses.find((address) => address.isDefaultBilling) ??
      orderSnapshot.billingAddress ??
      addresses[0] ??
      null,
  };
}

export async function getAdminOrderArtworkPreviews(
  order: PaymentOrderRecord,
): Promise<AdminOrderArtworkPreview[]> {
  const placementByFileId = new Map<
    string,
    { filename: string; mimeType: string }
  >();
  for (const item of order.items) {
    for (const placement of item.embroideryPlacements) {
      if (!placement.logoFileId || placementByFileId.has(placement.logoFileId)) continue;
      placementByFileId.set(placement.logoFileId, {
        filename: placement.logoFileName || "Logo customer",
        mimeType: mimeTypeFromFilename(placement.logoFileName),
      });
    }
  }

  return Promise.all(
    [...placementByFileId.entries()].map(async ([fileId, file]) => {
      const signed = await storageService
        .getSignedFileUrl({ companyId: order.companyId, fileId })
        .catch(() => null);
      return {
        fileId,
        filename: file.filename,
        mimeType: file.mimeType,
        signedUrl: signed?.signedUrl ?? null,
        unavailable: !signed?.signedUrl,
      };
    }),
  );
}

function getOrderAddressSnapshot(order: PaymentOrderRecord) {
  const row = order as unknown as Record<string, unknown>;
  return {
    shippingAddress: mapOptionalAddress(
      row.shippingAddress ?? row.destinationAddress ?? row.shipping_address,
      "Alamat pengiriman",
    ),
    billingAddress: mapOptionalAddress(
      row.billingAddress ?? row.billing_address,
      "Alamat penagihan",
    ),
  };
}

function mapOptionalAddress(value: unknown, fallbackLabel: string) {
  const row = asRecord(value);
  if (!row) return null;
  const street = text(row, "street", "addressLine", "address_line", "address");
  if (!street) return null;
  return {
    id: text(row, "id") ?? `snapshot-${fallbackLabel}`,
    label: text(row, "label") ?? fallbackLabel,
    recipientName: text(row, "recipientName", "recipient_name", "name") ?? "-",
    recipientPhone: text(row, "recipientPhone", "phone") ?? "-",
    street,
    city: text(row, "city") ?? "-",
    province: text(row, "province") ?? "-",
    postalCode: text(row, "postalCode", "postal_code") ?? "-",
    isDefaultShipping: fallbackLabel === "Alamat pengiriman",
    isDefaultBilling: fallbackLabel === "Alamat penagihan",
  } satisfies AdminOrderAddressSnapshot;
}

function mapAddress(row: Record<string, unknown>): AdminOrderAddressSnapshot {
  return {
    id: String(row.id ?? ""),
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(
  row: Record<string, unknown> | null,
  ...keys: string[]
): string | null {
  if (!row) return null;
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function mimeTypeFromFilename(filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "webp") return "image/webp";
  if (extension === "pdf") return "application/pdf";
  return "application/octet-stream";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
