"use client";

import { usePathname } from "next/navigation";

import { AdminBackLink } from "./AdminSurface";

export function AdminHeaderProductNavigation() {
  const pathname = usePathname();
  const editingProduct = /^\/admin\/products\/woocommerce\/\d+\/?$/.test(pathname);

  if (editingProduct) {
    return (
      <div className="mt-1">
        <h1 className="sr-only">Edit produk</h1>
        <AdminBackLink href="/admin/products">Kembali ke produk</AdminBackLink>
      </div>
    );
  }

  return (
    <h1 className="mt-0.5 text-base font-bold tracking-[-0.025em] text-ink">
      Operations workbench
    </h1>
  );
}
