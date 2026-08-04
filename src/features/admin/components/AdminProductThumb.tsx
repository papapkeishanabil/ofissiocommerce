import { Package } from "lucide-react";

import { cn } from "@/lib/utils";

interface AdminProductThumbProps {
  src?: string | null;
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE = {
  sm: "h-12 w-12 rounded-lg",
  md: "h-16 w-16 rounded-xl",
  lg: "h-20 w-20 rounded-xl",
};

/** Product photo for admin line items. Falls back to a neutral icon tile. */
export function AdminProductThumb({
  src,
  alt,
  size = "md",
  className,
}: AdminProductThumbProps) {
  return (
    <div
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden border border-line bg-surface-muted",
        SIZE[size],
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain"
        />
      ) : (
        <span className="text-ink-subtle">
          <Package className="h-1/2 w-1/2" aria-hidden="true" />
        </span>
      )}
    </div>
  );
}
