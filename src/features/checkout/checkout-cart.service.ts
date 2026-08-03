import "server-only";

import { randomUUID } from "node:crypto";

import { productServerService } from "@/features/products/product.server-service";
import { storageService } from "@/features/storage/storage.service";
import type { SizeMatrix } from "@/types/industry";
import type { LogoPlacement } from "@/types/uniform-3d";
import { calculateQuantityTierPrice } from "@/features/products/quantity-pricing";
import { calculateEmbroideryPricing } from "@/features/products/embroidery-pricing";
import { getGlobalEmbroideryPricing } from "@/features/embroidery-pricing/global-embroidery-pricing.service";
import { createApiError } from "@/lib/security/safe-error-response";

import type {
  CheckoutCartRecord,
  SyncCheckoutCartInput,
  ValidatedCheckoutCartItem,
} from "./checkout-cart.types";
import { syncCheckoutCartSchema } from "./checkout-cart.validation";

const CART_TTL_MS = 30 * 60 * 1000;

type CheckoutCartGlobal = typeof globalThis & {
  __ofissioCheckoutCarts?: Map<string, CheckoutCartRecord>;
};

const checkoutCartGlobal = globalThis as CheckoutCartGlobal;
const checkoutCarts: Map<string, CheckoutCartRecord> =
  checkoutCartGlobal.__ofissioCheckoutCarts ?? new Map<string, CheckoutCartRecord>();
checkoutCartGlobal.__ofissioCheckoutCarts = checkoutCarts;

function sumSizes(sizes: SizeMatrix) {
  return Object.values(sizes).reduce((total, quantity) => total + quantity, 0);
}

async function validateAndPriceItem(
  input: SyncCheckoutCartInput["items"][number],
  companyId: string,
): Promise<ValidatedCheckoutCartItem> {
  const product = await productServerService.getProductById(input.productId);
  if (!product) throw new Error("Produk tidak ditemukan.");

  const validation = productServerService.validateProductForCart(product);
  if (!validation.ok) throw new Error(validation.reason);
  if (!product.model_3d) throw new Error("Model GLB produk tidak valid.");
  if (!product.available_colors.includes(input.selectedColor)) {
    throw new Error("Warna produk tidak tersedia.");
  }

  const totalQty = sumSizes(input.sizeMatrix);
  if (totalQty < product.moq) {
    throw new Error(`MOQ ${product.moq} pcs belum terpenuhi.`);
  }
  const embroideryPlacements = await resolveEmbroideryLogoFiles(
    companyId,
    input.embroideryPlacements,
  );
  const calculatedPrice = calculateQuantityTierPrice({
    regularPrice: product.priceFrom,
    totalQty,
    quantityPricing: product.quantityPricing,
  });
  const embroideryPricingSnapshot = (await getGlobalEmbroideryPricing()).pricing;
  const embroideryPrice = calculateEmbroideryPricing({
    totalQty,
    selectedZones: embroideryPlacements.map((placement) => placement.zone),
    productSupportedZones: product.embroidery_zones,
    globalEmbroideryPricing: embroideryPricingSnapshot,
  });

  return {
    productId: product.id,
    source: product.source,
    sourceId: product.source_id,
    productSlug: product.slug,
    productName: product.name,
    sku: product.sku,
    selectedColor: input.selectedColor,
    sizeMatrix: input.sizeMatrix,
    totalQty,
    priceFrom: calculatedPrice.unitPrice,
    regularPrice: product.priceFrom,
    finalUnitPrice: calculatedPrice.unitPrice,
    quantityTierLabel: calculatedPrice.tierLabel,
    quantityPricingBasis: product.quantityPricing?.basis ?? "total_order_qty",
    quantityPricingMode: product.quantityPricing?.mode ?? "fixed_unit_price",
    quantityTierApplied: calculatedPrice.tierApplied,
    subtotal: calculatedPrice.subtotal,
    productSubtotal: calculatedPrice.subtotal,
    selectedEmbroideryZones: embroideryPrice.lines.map((line) => line.zoneId).concat(embroideryPrice.missingPricingZones, embroideryPrice.unsupportedZones),
    embroideryPricingSnapshot,
    embroideryLines: embroideryPrice.lines,
    embroideryTotal: embroideryPrice.total,
    missingEmbroideryPricingZones: embroideryPrice.missingPricingZones.concat(embroideryPrice.unsupportedZones),
    customizationTotal: embroideryPrice.total,
    finalEstimatedTotal: calculatedPrice.subtotal + embroideryPrice.total,
    moq: product.moq,
    fulfillmentType: product.fulfillment,
    transactionMode: product.transaction_mode,
    model3dId: product.model_3d.id,
    model3dUrl: product.model_3d.url,
    customization: input.customization,
    embroideryPlacements,
  };
}

async function resolveEmbroideryLogoFiles(
  companyId: string,
  placements: LogoPlacement[],
) {
  let companyLogos: Awaited<ReturnType<typeof storageService.getFilesByCompany>> | null = null;
  const resolved: LogoPlacement[] = [];

  for (const placement of placements) {
    let file = await storageService.getFileById({
      companyId,
      fileId: placement.logoFileId,
    });

    // Older carts could be saved while the asynchronous upload was still in
    // progress, leaving the local `pending-*` id in localStorage. Resolve only
    // against the newest same-name logo owned by this company. New saves are
    // blocked in the configurator until the real storage id is available.
    if (!file && placement.logoFileId.startsWith("pending-")) {
      companyLogos ??= await storageService.getFilesByCompany(companyId, {
        fileType: "embroidery_logo",
      });
      const normalizedName = placement.logoFileName.trim().toLowerCase();
      file = companyLogos.find(
        (candidate) =>
          candidate.status !== "deleted" &&
          candidate.status !== "rejected" &&
          (candidate.originalFilename.trim().toLowerCase() === normalizedName ||
            candidate.safeFilename.trim().toLowerCase() === normalizedName),
      ) ?? null;
    }

    if (!file) {
      throw createApiError(
        "VALIDATION_ERROR",
        "Logo bordir pada keranjang belum selesai tersimpan. Buka konfigurasi 3D, upload ulang logo, lalu simpan setelah proses upload selesai.",
        400,
      );
    }
    if (file.status === "deleted" || file.status === "rejected") {
      throw createApiError(
        "VALIDATION_ERROR",
        "Logo bordir pada keranjang sudah tidak dapat digunakan.",
        400,
      );
    }
    if (file.fileType !== "company_logo" && file.fileType !== "embroidery_logo") {
      throw createApiError(
        "VALIDATION_ERROR",
        "File yang dipilih bukan logo bordir.",
        400,
      );
    }
    await storageService.markFileAsUsed({ companyId, fileId: file.id });
    resolved.push({
      ...placement,
      logoFileId: file.id,
      logoFileName: file.originalFilename,
    });
  }

  return resolved;
}

export async function syncCheckoutCart(input: SyncCheckoutCartInput): Promise<CheckoutCartRecord> {
  const parsed = syncCheckoutCartSchema.parse(input);
  const items = await Promise.all(
    parsed.items.map((item) => validateAndPriceItem(item, parsed.companyId)),
  );
  const now = new Date();
  const record: CheckoutCartRecord = {
    id: `cart_${randomUUID()}`,
    companyId: parsed.companyId,
    userId: parsed.userId,
    items,
    subtotal: items.reduce((total, item) => total + item.finalEstimatedTotal, 0),
    totalQty: items.reduce((total, item) => total + item.totalQty, 0),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + CART_TTL_MS).toISOString(),
  };
  checkoutCarts.set(record.id, record);
  return record;
}

export async function getValidatedCheckoutCart(
  cartId: string,
  companyId: string,
  userId: string,
): Promise<CheckoutCartRecord> {
  const stored = checkoutCarts.get(cartId);
  if (!stored) throw new Error("Cart checkout tidak ditemukan atau sudah kedaluwarsa.");
  if (stored.companyId !== companyId || stored.userId !== userId) {
    throw new Error("Cart checkout tidak dapat diakses.");
  }
  if (Date.parse(stored.expiresAt) <= Date.now()) {
    checkoutCarts.delete(cartId);
    throw new Error("Cart checkout sudah kedaluwarsa.");
  }

  // Rebuild from canonical product data on every payment attempt. Stored
  // price/model snapshots are never the final source of truth.
  const items = await Promise.all(
    stored.items.map((item) =>
      validateAndPriceItem({
        productId: item.productId,
        selectedColor: item.selectedColor,
        sizeMatrix: item.sizeMatrix,
        customization: item.customization,
        embroideryPlacements: item.embroideryPlacements,
      }, stored.companyId),
    ),
  );
  return {
    ...stored,
    items,
    subtotal: items.reduce((total, item) => total + item.finalEstimatedTotal, 0),
    totalQty: items.reduce((total, item) => total + item.totalQty, 0),
  };
}
