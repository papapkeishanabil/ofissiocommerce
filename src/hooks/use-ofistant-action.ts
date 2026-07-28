// src/hooks/use-ofistant-action.ts
// Action dispatcher: turns an OfistantAction into side effects (navigation,
// add-to-cart, gating). This is the bridge between agent output and the
// commerce workspace.

"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

import {
  type AddToCartAction,
  type OfistantAction,
} from "@/lib/ofistant/ofistant.actions";
import { productService } from "@/features/products/product.service";
import {
  getPrimaryActiveOrder,
  getTrackingOrder,
} from "@/features/tracking/tracking.service";
import { useCartStore } from "@/stores/cart-store";
import { useOfistantStore } from "@/stores/ofistant-store";
import { useUIStore } from "@/stores/ui-store";
import { useAuthStore } from "@/stores/auth-store";

export function useOfistantAction() {
  const router = useRouter();
  const addToCart = useCartStore((s) => s.add);
  const showPostAddLegacy = useOfistantStore((s) => s.setContext);
  const setOfistantContext = useOfistantStore((s) => s.setContext);
  const openAuth = useUIStore((s) => s.openAuth);
  const isAuthed = useAuthStore((s) => !!s.session);
  const session = useAuthStore((s) => s.session);

  const pendingIdRef = useRef<string | null>(null);

  // Subscribe to one-shot actions emitted by the store (non-confirming).
  const pendingAction = useOfistantStore((s) => s.pendingAction);

  useEffect(() => {
    setOfistantContext({
      companyId: session?.company.id ?? null,
      companyName: session?.company.companyName ?? null,
    });
  }, [
    session?.company.companyName,
    session?.company.id,
    setOfistantContext,
  ]);

  useEffect(() => {
    if (!pendingAction) return;
    // Skip actions that need confirmation — those go through confirm().
    if (pendingAction.action.type === "ADD_TO_CART") return;
    if (pendingIdRef.current === pendingAction.messageId) return;
    pendingIdRef.current = pendingAction.messageId;
    void dispatch(pendingAction.action);
    // dispatch is stable via useCallback; intentionally omitted from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAction]);

  const executeAddToCart = useCallback(
    (action: AddToCartAction): { ok: boolean; reason?: string } => {
      const product = productService.getProductBySlug(action.payload.productSlug);
      if (!product) {
        return { ok: false, reason: "Produk tidak ditemukan." };
      }
      const result = addToCart({
        product,
        color: action.payload.color,
        sizes: action.payload.sizeMatrix,
        customization: action.payload.customization ?? null,
      });
      if (!result.ok) {
        return { ok: false, reason: result.reason };
      }
      // Refresh cart summary in the agent context.
      const cartState = useCartStore.getState();
      const items = cartState.items;
      useOfistantStore.getState().setContext({
        cartSummary: {
          itemCount: items.length,
          totalQty: items.reduce((a, it) => a + it.totalQty, 0),
          totalEstimatedPrice: items.reduce(
            (a, it) => a + it.estimatedPrice,
            0,
          ),
        },
      });
      return { ok: true };
    },
    [addToCart],
  );

  const dispatch = useCallback(
    (action: OfistantAction): { ok: boolean; reason?: string } => {
      switch (action.type) {
        case "SHOW_PRODUCTS": {
          const p = action.payload;
          const params = new URLSearchParams();
          if (p?.industry) params.set("industri", p.industry);
          if (p?.category) params.set("kategori", p.category);
          const qs = params.toString();
          router.push(qs ? `/catalog?${qs}` : "/catalog");
          return { ok: true };
        }
        case "OPEN_PRODUCT_DETAIL": {
          const product = productService.getProductBySlug(action.payload.slug);
          if (!product) {
            return { ok: false, reason: "Produk belum published atau model GLB tidak valid." };
          }
          router.push(`/product/${product.slug}`);
          return { ok: true };
        }
        case "SHOW_PRODUCT_COMPARISON": {
          // Phase 3 placeholder: compare not built yet — fall back to catalog.
          router.push("/catalog");
          return { ok: true };
        }
        case "OPEN_CART": {
          router.push("/cart");
          return { ok: true };
        }
        case "OPEN_CHECKOUT": {
          if (!isAuthed) {
            openAuth({ kind: "checkout" });
            return { ok: false, reason: "Login diperlukan." };
          }
          router.push("/checkout");
          return { ok: true };
        }
        case "OPEN_REGISTER": {
          openAuth({ kind: "none" }, "register");
          return { ok: true };
        }
        case "REQUEST_QUOTATION": {
          if (!isAuthed) {
            openAuth({ kind: "request_quote" });
            return { ok: false, reason: "Login diperlukan." };
          }
          router.push("/quote");
          return { ok: true };
        }
        case "OPEN_ORDER_TRACKING": {
          const requestedId =
            action.payload?.orderId ?? action.payload?.order_id ?? null;
          const scope = {
            companyId: session?.company.id,
            companyName: session?.company.companyName,
          };
          const requestedOrder = requestedId
            ? getTrackingOrder(requestedId, scope)
            : null;
          const fallbackOrder = getPrimaryActiveOrder({
            companyId: session?.company.id,
            companyName: session?.company.companyName,
          });
          const targetOrderId = requestedOrder?.id ?? fallbackOrder?.id ?? null;
          if (session) {
            void fetch("/api/security/audit", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                companyId: session.company.id,
                userId: session.user.id,
                action: "ofistant_tracking_request",
                entityType: "tracking_order",
                entityId: targetOrderId,
                metadata: { requestedId },
              }),
            }).catch(() => undefined);
          }
          router.push(targetOrderId ? `/orders/${targetOrderId}` : "/dashboard");
          return { ok: true };
        }
        case "ADD_TO_CART": {
          return executeAddToCart(action);
        }
        case "SET_SELECTED_COLOR":
        case "SET_SIZE_MATRIX":
        case "SET_EMBROIDERY_ZONES": {
          // Configuration actions: update context only (Phase 8 wires UI).
          showPostAddLegacy({});
          return { ok: true };
        }
        case "REQUEST_HUMAN_HANDOFF": {
          // No-op navigation; messaging handled in chat.
          return { ok: true };
        }
        default: {
          // exhaustive
          return { ok: false, reason: "Action tidak dikenal." };
        }
      }
    },
    [
      router,
      isAuthed,
      session,
      openAuth,
      showPostAddLegacy,
      executeAddToCart,
    ],
  );

  return { dispatch };
}
