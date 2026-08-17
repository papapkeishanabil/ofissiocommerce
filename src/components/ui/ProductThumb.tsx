// src/components/ui/ProductThumb.tsx
// Product image thumbnail with a graceful brand fallback. Used wherever a
// cart/order line appears (cart, checkout review, payment) so the customer
// always sees what they are buying.

import { Package } from "lucide-react";

import { cn } from "@/lib/utils";

interface ProductThumbProps {
  src?: string | null;
  alt: string;
  /** size/shape classes, e.g. "h-10 w-10 shrink-0" */
  className?: string;
}

export function ProductThumb({ src, alt, className }: ProductThumbProps) {
  if (!src) {
    return (
      <span
        aria-hidden
        className={cn(
          "grid shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700",
          className,
        )}
      >
        <Package className="h-5 w-5" />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={cn(
        "shrink-0 rounded-xl border border-line bg-surface object-cover",
        className,
      )}
    />
  );
}
