"use client";

import { useEffect, useState } from "react";

/** A manual close only applies while the customer remains on this product. */
export function useFloatingPreviewState(productId: string) {
  const [dismissedForProduct, setDismissedForProduct] = useState<string | null>(null);

  useEffect(() => {
    setDismissedForProduct(null);
  }, [productId]);

  return {
    isDismissed: dismissedForProduct === productId,
    dismiss: () => setDismissedForProduct(productId),
  };
}
