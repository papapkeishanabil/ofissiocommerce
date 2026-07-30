import type {
  PaymentOrderRecord,
  PaymentRecord,
  PaymentStatus,
} from "@/features/payment/payment.types";
import { ensureOrderProcessRouting } from "./order-routing.service";
import type {
  WooCommerceCreateOrderInput,
  WooCommerceOrderLineItem,
  WooCommerceOrderMeta,
} from "@/features/products/woocommerce/woocommerce.types";

export function mapPaymentOrderToWooCommerceOrder(input: {
  order: PaymentOrderRecord;
  payment: PaymentRecord;
  companyName?: string | null;
  picName?: string | null;
  picWhatsapp?: string | null;
  quotationId?: string | null;
}): WooCommerceCreateOrderInput {
  const { payment } = input;
  const order = ensureOrderProcessRouting(input.order);
  return {
    status: "pending",
    currency: "IDR",
    set_paid: false,
    line_items: order.items.map((item, index): WooCommerceOrderLineItem => {
      const productId =
        item.source === "woocommerce" && /^\d+$/.test(item.sourceId)
          ? Number(item.sourceId)
          : undefined;
      return {
        product_id: productId,
        name: item.productName,
        sku: item.sku,
        quantity: item.totalQty,
        subtotal: String(item.priceFrom * item.totalQty),
        total: String(item.priceFrom * item.totalQty),
        meta_data: compactMeta([
          ["ofissio_product_id", item.productId],
          ["ofissio_product_source", item.source],
          ["ofissio_source_id", item.sourceId],
          ["product_slug", item.productSlug],
          ["selected_color", item.selectedColor],
          ["size_matrix", JSON.stringify(item.sizeMatrix)],
          ["embroidery_placements", JSON.stringify(item.embroideryPlacements)],
          [
            "logo_file_names",
            JSON.stringify(item.embroideryPlacements.map((p) => p.logoFileName)),
          ],
          [
            "logo_file_ids",
            JSON.stringify(item.embroideryPlacements.map((p) => p.logoFileId)),
          ],
          ["customization_notes", item.customization],
          ["model_3d_id", item.model3dId],
          ["model_3d_url", item.model3dUrl],
          ["configuration_id", `${order.id}-${index}`],
          ["snapshot_front", ""],
          ["snapshot_right", ""],
          ["snapshot_back", ""],
        ]),
      };
    }),
    shipping_lines:
      order.calculation.shippingFee > 0
        ? [
            {
              method_title: "Ofissio Shipping",
              method_id: order.shippingRateId ?? "ofissio_shipping",
              total: String(order.calculation.shippingFee),
            },
          ]
        : [],
    meta_data: compactMeta([
      ["ofissio_source", "ofissio"],
      ["ofissio_order_id", order.id],
      ["ofissio_order_number", order.orderNumber ?? order.id],
      ["company_id", order.companyId],
      ["company_name", input.companyName],
      ["pic_name", input.picName],
      ["pic_whatsapp", input.picWhatsapp],
      ["quotation_id", input.quotationId ?? order.quotationId],
      ["payment_provider", payment.provider],
      ["payment_reference", payment.referenceId],
      ["fulfillment_type", order.items[0]?.fulfillmentType],
      ["transaction_mode", order.items[0]?.transactionMode],
      ["process_route", order.processRoute],
      ["process_status", order.processStatus],
      ["replenishment_status", order.replenishmentStatus],
      ["has_customization", String(order.hasCustomization ?? false)],
      ["customization_type", order.customizationType],
      ["tracking_id", order.id],
    ]),
  };
}

export function mapPaymentStatusToWooCommerceStatus(status: PaymentStatus) {
  switch (status) {
    case "waiting_payment":
    case "pending":
    case "expired":
      return "pending";
    case "paid":
      return "processing";
    case "cancelled":
      return "cancelled";
    case "failed":
      return "failed";
    case "refunded":
      return "refunded";
  }
}

function compactMeta(rows: Array<[string, string | null | undefined]>): WooCommerceOrderMeta[] {
  return rows
    .filter(([, value]) => value != null && value !== "")
    .map(([key, value]) => ({ key, value: String(value) }));
}
