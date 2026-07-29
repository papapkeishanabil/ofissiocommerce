import type { ValidatedCheckoutCartItem } from "@/features/checkout/checkout-cart.types";
import type { PaymentOrderRecord } from "@/features/payment/payment.types";
import type {
  OrderCustomizationType,
  OrderProcessRoute,
  OrderProcessRouting,
  OrderProcessStatus,
} from "./order.types";

type RoutingInput =
  | Pick<PaymentOrderRecord, "items" | "processStatus" | "replenishmentStatus">
  | {
      items: ValidatedCheckoutCartItem[];
      processStatus?: OrderProcessStatus;
      replenishmentStatus?: PaymentOrderRecord["replenishmentStatus"];
    };

const CUSTOM_DESIGN_KEYWORDS = [
  "custom design",
  "custom desain",
  "desain khusus",
  "model khusus",
  "bahan khusus",
  "pola khusus",
  "ukuran khusus",
  "made to order khusus",
  "spk produksi",
  "produksi khusus",
] as const;

export function deriveOrderProcessRouting(input: RoutingInput): OrderProcessRouting {
  const customizationType = deriveCustomizationType(input.items);
  const hasCustomization = customizationType !== "none";
  const processRoute = routeForCustomization(customizationType);
  const replenishmentStatus = input.replenishmentStatus ?? "not_required";
  return {
    processRoute,
    processStatus:
      replenishmentStatus === "needed"
        ? "waiting_replenishment"
        : input.processStatus ?? "ready_to_process",
    replenishmentStatus,
    hasCustomization,
    customizationType,
    processRouteReason: reasonForRoute(processRoute, customizationType),
  };
}

export function ensureOrderProcessRouting(order: PaymentOrderRecord): PaymentOrderRecord {
  const routing = deriveOrderProcessRouting(order);
  return {
    ...order,
    processRoute: order.processRoute ?? routing.processRoute,
    processStatus: order.processStatus ?? routing.processStatus,
    replenishmentStatus: order.replenishmentStatus ?? routing.replenishmentStatus,
    hasCustomization: order.hasCustomization ?? routing.hasCustomization,
    customizationType: order.customizationType ?? routing.customizationType,
    processRouteReason: order.processRouteReason ?? routing.processRouteReason,
  };
}

export function processButtonLabel(route: OrderProcessRoute) {
  switch (route) {
    case "fulfillment":
      return "Buat Fulfillment Order";
    case "customization":
      return "Buat Customization Order";
    case "production":
      return "Buat Production Order";
  }
}

export function processRouteLabel(route: OrderProcessRoute) {
  switch (route) {
    case "fulfillment":
      return "Fulfillment Order";
    case "customization":
      return "Customization Order";
    case "production":
      return "Production Order";
  }
}

export function processRouteSteps(route: OrderProcessRoute) {
  switch (route) {
    case "fulfillment":
      return ["Picking", "Packing", "Shipping"];
    case "customization":
      return ["Ambil produk standar", "Bordir/sablon/nama", "QC custom", "Packing"];
    case "production":
      return [
        "Approval desain",
        "Bahan",
        "Cutting",
        "Sewing",
        "Bordir/sablon",
        "Finishing",
        "QC",
        "Packing",
      ];
  }
}

export function nextProcessStatus(current?: OrderProcessStatus): OrderProcessStatus {
  switch (current) {
    case "in_progress":
    case "waiting_replenishment":
      return current;
    case "completed":
      return "completed";
    case "not_started":
    case "ready_to_process":
    default:
      return "in_progress";
  }
}

function routeForCustomization(type: OrderCustomizationType): OrderProcessRoute {
  if (type === "custom_design") return "production";
  if (type === "none") return "fulfillment";
  return "customization";
}

function deriveCustomizationType(items: ValidatedCheckoutCartItem[]): OrderCustomizationType {
  const types = items.map(deriveItemCustomizationType);
  return firstByPriority(types);
}

function deriveItemCustomizationType(item: ValidatedCheckoutCartItem): OrderCustomizationType {
  const note = item.customization?.toLowerCase() ?? "";
  if (CUSTOM_DESIGN_KEYWORDS.some((keyword) => note.includes(keyword))) {
    return "custom_design";
  }
  if (note.includes("dtf")) return "dtf";
  if (note.includes("name tag") || note.includes("nametag") || note.includes("nama")) {
    return "name_tag";
  }
  if (note.includes("sablon") || note.includes("screen printing")) {
    return "screen_printing";
  }

  const placements = item.embroideryPlacements ?? [];
  if (placements.some((placement) => placement.technique === "print")) {
    return "screen_printing";
  }
  if (placements.length > 0) return "embroidery";

  return "none";
}

function firstByPriority(types: OrderCustomizationType[]): OrderCustomizationType {
  for (const type of [
    "custom_design",
    "embroidery",
    "screen_printing",
    "dtf",
    "name_tag",
  ] satisfies OrderCustomizationType[]) {
    if (types.includes(type)) return type;
  }
  return "none";
}

function reasonForRoute(route: OrderProcessRoute, type: OrderCustomizationType) {
  if (route === "fulfillment") {
    return "Produk standar tanpa custom diproses sebagai fulfillment order.";
  }
  if (route === "customization") {
    return `Produk standar dengan custom ringan (${type}) diproses sebagai customization order.`;
  }
  return "Custom design/model/bahan khusus diproses sebagai production order/SPK.";
}
