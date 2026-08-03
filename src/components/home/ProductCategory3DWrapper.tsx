"use client";

import dynamic from "next/dynamic";

const ProductCategory3D = dynamic(() => import("./ProductCategory3D").then((m) => m.ProductCategory3D), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
    </div>
  ),
});

export function ProductCategory3DWrapper({ url }: { url: string }) {
  return <ProductCategory3D url={url} />;
}
