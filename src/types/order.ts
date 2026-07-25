// src/types/order.ts
// Phase 2: order & quotation are persisted locally (mock).
// Phase 4 (iPaymu) + Phase 5 (real quotation flow) extend these.

import type { CartLineItem } from "./cart";

export type OrderType = "READY_STOCK" | "MADE_TO_ORDER";

export type OrderStatus =
  | "waiting_payment_dummy" // Phase 2 dummy payment
  | "pending" // Phase 4 iPaymu pending
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface OrderLine {
  productId: string;
  productSlug: string;
  productName: string;
  sku: string;
  color: string;
  sizes: CartLineItem["sizes"];
  totalQty: number;
  unitPrice: number;
  estimatedPrice: number;
  customization: string | null;
}

export interface Order {
  id: string;
  code: string; // OF-ORD-XXXXX
  companyId: string;
  userId: string;
  type: OrderType;
  status: OrderStatus;
  items: OrderLine[];
  shippingAddressLabel: string;
  notes: string | null;
  subtotal: number;
  tax: number;
  shippingCost: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

export type QuotationStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "quoted"
  | "accepted"
  | "rejected"
  | "expired";

export interface Quotation {
  id: string;
  code: string; // OF-QUO-XXXXX
  companyId: string;
  userId: string;
  items: OrderLine[];
  notes: string | null;
  status: QuotationStatus;
  createdAt: string;
  updatedAt: string;
}

export function statusLabel(s: OrderStatus): string {
  switch (s) {
    case "waiting_payment_dummy":
      return "Menunggu Pembayaran (dummy)";
    case "pending":
      return "Menunggu Pembayaran";
    case "paid":
      return "Lunas";
    case "processing":
      return "Diproses";
    case "shipped":
      return "Dikirim";
    case "delivered":
      return "Selesai";
    case "cancelled":
      return "Dibatalkan";
    case "refunded":
      return "Dikembalikan";
  }
}

export function quotationStatusLabel(s: QuotationStatus): string {
  switch (s) {
    case "draft":
      return "Draft";
    case "submitted":
      return "Terkirim";
    case "in_review":
      return "Sedang Ditinjau";
    case "quoted":
      return "Sudah Diquotakan";
    case "accepted":
      return "Diterima";
    case "rejected":
      return "Ditolak";
    case "expired":
      return "Kedaluwarsa";
  }
}
