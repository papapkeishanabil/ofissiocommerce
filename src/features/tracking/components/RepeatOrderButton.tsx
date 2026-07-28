"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { productService } from "@/features/products/product.service";
import type { CustomerTrackingOrder } from "@/features/tracking/tracking.types";
import { useCartStore } from "@/stores/cart-store";

interface RepeatOrderButtonProps {
  order: CustomerTrackingOrder;
  compact?: boolean;
}

export function RepeatOrderButton({ order, compact }: RepeatOrderButtonProps) {
  const router = useRouter();
  const addToCart = useCartStore((state) => state.add);
  const [message, setMessage] = useState<string | null>(null);

  function handleRepeatOrder() {
    setMessage(null);
    let copied = 0;

    for (const item of order.items) {
      const product = productService.getProductBySlug(item.productSlug);
      if (!product) {
        setMessage("Produk dari order lama belum tersedia untuk repeat order.");
        return;
      }

      const result = addToCart({
        product,
        color: item.selectedColor,
        sizes: item.sizeMatrix,
        customization: item.notes ?? null,
        uniform3DConfig: item.uniform3DConfig ?? null,
      });

      if (!result.ok) {
        setMessage(result.reason ?? "Item belum bisa dicopy ke cart.");
        return;
      }
      copied += 1;
    }

    setMessage(`${copied} item berhasil dicopy ke cart.`);
    router.push("/cart");
  }

  return (
    <div>
      <Button
        type="button"
        size={compact ? "sm" : "md"}
        variant="primary"
        onClick={handleRepeatOrder}
        className={compact ? "" : "w-full"}
      >
        <RotateCcw className="h-4 w-4" />
        Pesan Ulang
      </Button>
      {message && (
        <p className="mt-2 text-[11px] font-semibold text-brand-700" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
