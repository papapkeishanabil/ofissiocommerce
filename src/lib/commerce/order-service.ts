// src/lib/commerce/order-service.ts
// Local mock order & quotation store. Scoped to user+company per
// docs/security.md §3.2 (company scoping). Phase 4/5 swap to server-side.

import type { CartLineItem } from "@/types/cart";
import type { Order, OrderLine, OrderType, Quotation } from "@/types/order";
import {
  readJSON,
  writeJSON,
  genId,
  genCode,
  nowISO,
} from "@/lib/mock/storage";

interface OrderDB {
  orders: Order[];
  quotations: Quotation[];
}

const DB_KEY = "orders";

function loadDB(): OrderDB {
  return readJSON<OrderDB>(DB_KEY, { orders: [], quotations: [] });
}

function saveDB(db: OrderDB): void {
  writeJSON(DB_KEY, db);
}

export function cartLineToOrderLine(item: CartLineItem): OrderLine {
  return {
    productId: item.productId,
    productSlug: item.productSlug,
    productName: item.productName,
    sku: item.sku,
    color: item.color,
    sizes: item.sizes,
    totalQty: item.totalQty,
    unitPrice: item.unitPrice,
    estimatedPrice: item.estimatedPrice,
    customization: item.customization,
  };
}

export function deriveOrderType(items: CartLineItem[]): OrderType {
  // Phase 2: derived from fulfillment meta embedded in product — but we only
  // have CartLineItem here. Conservative default: READY_STOCK; Phase 4 will
  // attach product.fulfillment explicitly at checkout build time.
  return "READY_STOCK";
}

interface CreateOrderInput {
  companyId: string;
  userId: string;
  items: CartLineItem[];
  shippingAddressLabel: string;
  notes?: string | null;
  subtotal: number;
  tax: number;
  shippingCost: number;
}

export function createOrder(input: CreateOrderInput): Order {
  const db = loadDB();
  const now = nowISO();
  const order: Order = {
    id: genId("ord"),
    code: genCode("OF-ORD"),
    companyId: input.companyId,
    userId: input.userId,
    type: deriveOrderType(input.items),
    status: "waiting_payment_dummy",
    items: input.items.map(cartLineToOrderLine),
    shippingAddressLabel: input.shippingAddressLabel,
    notes: input.notes ?? null,
    subtotal: input.subtotal,
    tax: input.tax,
    shippingCost: input.shippingCost,
    total: input.subtotal + input.tax + input.shippingCost,
    createdAt: now,
    updatedAt: now,
  };
  db.orders.unshift(order); // newest first
  saveDB(db);
  return order;
}

interface CreateQuotationInput {
  companyId: string;
  userId: string;
  items: CartLineItem[];
  notes?: string | null;
}

export function createQuotation(input: CreateQuotationInput): Quotation {
  const db = loadDB();
  const now = nowISO();
  const q: Quotation = {
    id: genId("quo"),
    code: genCode("OF-QUO"),
    companyId: input.companyId,
    userId: input.userId,
    items: input.items.map(cartLineToOrderLine),
    notes: input.notes ?? null,
    status: "submitted",
    createdAt: now,
    updatedAt: now,
  };
  db.quotations.unshift(q);
  saveDB(db);
  return q;
}

export function listOrders(companyId: string): Order[] {
  return loadDB().orders.filter((o) => o.companyId === companyId);
}

export function listQuotations(companyId: string): Quotation[] {
  return loadDB().quotations.filter((q) => q.companyId === companyId);
}

export function getOrder(id: string): Order | undefined {
  return loadDB().orders.find((o) => o.id === id);
}

export function getQuotation(id: string): Quotation | undefined {
  return loadDB().quotations.find((q) => q.id === id);
}
