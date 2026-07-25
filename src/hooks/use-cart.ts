// src/hooks/use-cart.ts
// Convenience selectors with hydration guard.

import { useCartStore } from "@/stores/cart-store";

export function useCartCount(): number {
  return useCartStore((s) => s.items.reduce((acc, it) => acc + it.totalQty, 0));
}

export function useCartHydrated(): boolean {
  return useCartStore((s) => s.hydrated);
}

export function useCartItems() {
  return useCartStore((s) => s.items);
}

export function useCartTotal(): number {
  return useCartStore((s) =>
    s.items.reduce((acc, it) => acc + it.estimatedPrice, 0),
  );
}
