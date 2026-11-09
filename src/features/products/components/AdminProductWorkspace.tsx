"use client";

import { useId, useRef, useState, type ReactNode } from "react";

export function AdminProductWorkspace({ information, stock, mapping, stockCount }: {
  information: ReactNode;
  stock?: ReactNode;
  mapping?: ReactNode;
  stockCount?: number;
}) {
  const id = useId();
  const [active, setActive] = useState("information");
  const tabs = [
    { key: "information", label: "Informasi produk", content: information },
    ...(stock ? [{ key: "stock", label: `Stok SKU${stockCount === undefined ? "" : ` (${stockCount})`}`, content: stock }] : []),
    ...(mapping ? [{ key: "mapping", label: "Pemetaan SKU", content: mapping }] : []),
  ];
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  return <div className="space-y-5">
    <div className="rounded-xl bg-white px-3 py-3 shadow-soft-sm sm:px-4">
      <div role="tablist" aria-label="Bagian pengelolaan produk" className="flex flex-wrap gap-2">
        {tabs.map((tab, index) => <button key={tab.key} ref={node => { buttons.current[index] = node; }}
          type="button" role="tab" id={`${id}-tab-${tab.key}`} aria-controls={`${id}-panel-${tab.key}`}
          aria-selected={active === tab.key} tabIndex={active === tab.key ? 0 : -1}
          className={`min-h-11 rounded-lg px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${active === tab.key ? "bg-brand-700 text-white" : "bg-slate-50 text-ink-muted hover:bg-brand-50 hover:text-brand-800"}`}
          onClick={() => setActive(tab.key)}
          onKeyDown={event => {
            let next = index;
            if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
            else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = tabs.length - 1;
            else return;
            event.preventDefault();setActive(tabs[next]!.key);buttons.current[next]?.focus();
          }}>{tab.label}</button>)}
      </div>
      <p className="mt-3 text-xs leading-5 text-ink-muted">Edit data utama di Informasi produk.{stock ? " Buka Stok SKU untuk memeriksa persediaan." : ""}{mapping ? " Pemetaan SKU digunakan untuk mengatur kode varian." : ""} Isian form tetap ada saat berpindah tab; simpan melalui tombol pada form terkait.</p>
    </div>
    {tabs.map(tab => <div key={tab.key} role="tabpanel" id={`${id}-panel-${tab.key}`} aria-labelledby={`${id}-tab-${tab.key}`}
      hidden={active !== tab.key} tabIndex={0} className="min-w-0 focus-visible:outline-2 focus-visible:outline-brand-600">
      {tab.content}
    </div>)}
  </div>;
}
