// src/lib/ofistant/ofistant.types.ts
// Domain types for the Ofistant agent. The shapes here are what a future
// LLM/tool-calling layer must return — so the rest of the app never needs
// to know whether the brain is rule-based or model-based.

import type { z } from "zod";

import type { OfistantAction } from "./ofistant.actions";

export type JourneyStage =
  | "NEW_VISITOR"
  | "INDUSTRY_SELECTED"
  | "PRODUCT_RECOMMENDED"
  | "PRODUCT_VIEWED"
  | "CONFIGURING_PRODUCT"
  | "ITEM_ADDED_TO_CART"
  | "EXPLORING_MORE_PRODUCTS"
  | "CART_REVIEW"
  | "REGISTER_REQUIRED"
  | "CHECKOUT"
  | "QUOTATION_SUBMITTED";

export const JOURNEY_STAGES: readonly JourneyStage[] = [
  "NEW_VISITOR",
  "INDUSTRY_SELECTED",
  "PRODUCT_RECOMMENDED",
  "PRODUCT_VIEWED",
  "CONFIGURING_PRODUCT",
  "ITEM_ADDED_TO_CART",
  "EXPLORING_MORE_PRODUCTS",
  "CART_REVIEW",
  "REGISTER_REQUIRED",
  "CHECKOUT",
  "QUOTATION_SUBMITTED",
] as const;

export interface SizeMatrixSnapshot {
  S: number;
  M: number;
  L: number;
  XL: number;
  "2XL": number;
  "3XL": number;
}

/** Ofistant's memory of the current session. */
export interface OfistantContext {
  selectedIndustry: string | null;
  selectedProductId: string | null;
  selectedProductSlug: string | null;
  selectedColor: string | null;
  sizeMatrix: SizeMatrixSnapshot | null;
  viewedProductIds: string[];
  cartSummary: {
    itemCount: number;
    totalQty: number;
    totalEstimatedPrice: number;
  } | null;
  uploadedLogoPlaceholder: boolean;
  embroideryPlacements: string[];
  journeyStage: JourneyStage;
  /** monotonic counter to log progression for debugging */
  turnsTaken: number;
}

export function emptyContext(): OfistantContext {
  return {
    selectedIndustry: null,
    selectedProductId: null,
    selectedProductSlug: null,
    selectedColor: null,
    sizeMatrix: null,
    viewedProductIds: [],
    cartSummary: null,
    uploadedLogoPlaceholder: false,
    embroideryPlacements: [],
    journeyStage: "NEW_VISITOR",
    turnsTaken: 0,
  };
}

/** A single chat message in the conversation. */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  /** timestamp ms */
  ts: number;
  /** optional action attached to an assistant message */
  action?: OfistantAction;
  /** when true, requires user confirmation before executing the action */
  requiresConfirm?: boolean;
  /** short label set when this message originated from a quick reply */
  viaQuickReply?: string;
}

/**
 * Internal response format produced by the agent brain (rules today, LLM later).
 * Components never read this directly — the store transforms it into chat
 * messages and a dispatched action.
 */
export interface OfistantResponse {
  message: string;
  action?: OfistantAction;
  quickReplies?: string[];
  /** whether the assistant message needs the user to confirm before running */
  requiresConfirm?: boolean;
  /** updated context fields the brain wants merged (shallow) */
  contextPatch?: Partial<OfistantContext>;
}

/** Convenience: the inferred Zod action type re-exported as a value-less type. */
export type AnyAction = z.ZodTypeAny;
