"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

export function DeleteProductButton({ id, name }: { id: number; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (busy || !window.confirm(`Hapus produk “${name}”?\n\nProduk akan hilang dari daftar produk dan katalog pelanggan. Produk dapat dipulihkan melalui Trash WooCommerce.`)) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/products/woocommerce/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed: true }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || "Produk belum dapat dihapus.");
      router.replace("/admin/products");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Produk belum dapat dihapus.");
      setBusy(false);
    }
  }

  return (
    <div className="flex max-w-sm flex-col items-start gap-2">
      <button type="button" onClick={remove} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-wait disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
        {busy ? "Menghapus…" : "Hapus Produk"}
      </button>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
