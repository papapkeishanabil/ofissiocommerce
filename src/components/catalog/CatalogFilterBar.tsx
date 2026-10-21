"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import { productColorDisplayLabel } from "@/lib/product-colors";
import { CATALOG_COLOR_FAMILIES, catalogColorFamily, catalogColorSwatchStyle } from "./catalog-colors";
import colorStyles from "./CatalogColorOptions.module.css";
export interface FilterOption { slug: string; label: string; count: number }
interface Props { industry?: string; category?: string; color?: string; industries: FilterOption[]; colors: FilterOption[]; total: number; facets: Record<string,string[]>; selected: Record<string,string>; onFacetChange: (key:string,value:string) => void; onReset: () => void }
export function CatalogFilterBar({ industry, category, color, industries, colors, total, facets, selected, onFacetChange, onReset }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(true);
  const [expandedColors, setExpandedColors] = useState<Record<string, boolean>>({});
  const colorGroups = CATALOG_COLOR_FAMILIES.map(family => ({
    ...family, shades: colors.filter(item => catalogColorFamily(item.label) === family.slug),
  })).filter(family => family.shades.length > 0);
  useEffect(() => { setOpen(window.matchMedia("(min-width: 851px)").matches); }, []);
  function apply(key: "industry" | "color", value: string) {
    const next = { industry, category, color, [key]: value };
    const params = new URLSearchParams();
    if(next.industry) params.set("industri",next.industry);
    if(next.category) params.set("kategori",next.category);
    if(next.color) params.set("warna",next.color);
    startTransition(() => router.push("/catalog" + (params.size ? "?" + params : ""), {scroll:false}));
  }
  return <details open={open} onToggle={event => setOpen(event.currentTarget.open)} className="catalog-filter-drawer">
    <summary><SlidersHorizontal size={18}/> Filter produk <ChevronDown size={16}/></summary>
    <aside className="catalog-filter-bar" aria-label="Filter katalog" aria-busy={pending}>
      <div className="catalog-filter-title"><b>Filter Produk</b><button type="button" disabled={pending} onClick={() => { onReset(); startTransition(() => router.push("/catalog",{scroll:false})); }}><RotateCcw size={16}/> Reset</button></div>
      <details open className="catalog-filter-section"><summary>Pria / Wanita <ChevronDown size={18}/></summary>
        <fieldset><legend className="sr-only">Filter gender produk</legend>
          {["", "Pria", "Wanita"].map(value => <label key={value}><input type="radio" name="catalog-gender" value={value} checked={(selected.Gender ?? "") === value} disabled={pending} onChange={() => onFacetChange("Gender", value)}/><span>{value || "Semua"}</span></label>)}
        </fieldset>
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">Produk unisex tersedia pada kedua pilihan.</p>
      </details>
      {industries.length > 0 && <details open className="catalog-filter-section"><summary>Industri <ChevronDown size={18}/></summary>
        <div className="catalog-industry-options"><label><input type="radio" name="industry" checked={!industry} disabled={pending} onChange={() => apply("industry","")}/><span>Semua industri</span><small>{total}</small></label>
        {industries.map(item => <label key={item.slug}><input type="radio" name="industry" checked={industry === item.slug} disabled={pending} onChange={() => apply("industry",item.slug)}/><span>{item.label}</span><small>{item.count}</small></label>)}
      </div></details>}
      {colors.length > 0 && <details open className="catalog-filter-section"><summary>Warna <ChevronDown size={18}/></summary><div className={`catalog-color-swatches ${colorStyles.colors}`}>
        {colorGroups.map(family => {
          const shadeSelected = family.shades.some(item => item.slug === color);
          const expanded = expandedColors[family.slug] ?? (shadeSelected || color === family.slug);
          return <div key={family.slug} className={colorStyles.family}>
            <div className={colorStyles.familyRow}>
              <button type="button" disabled={pending} className={colorStyles.familySelect} aria-pressed={color === family.slug} onClick={() => apply("color", color === family.slug ? "" : family.slug)}>
                <span aria-hidden="true" className={colorStyles.sample} style={catalogColorSwatchStyle(family.sample)}/><span>{family.label}</span>
              </button>
              <button type="button" className={colorStyles.expand} aria-label={`Lihat shade ${family.label}`} aria-expanded={expanded} onClick={() => setExpandedColors(previous => ({...previous, [family.slug]: !expanded}))}><ChevronDown size={16}/></button>
            </div>
            {expanded && <div role="group" aria-label={`Shade ${family.label}`} className={colorStyles.shades}>
              {family.shades.map(item => <button key={item.slug} type="button" disabled={pending} title={item.label} aria-label={item.label + " (" + item.count + " produk)"} aria-pressed={color === item.slug} onClick={() => apply("color", color === item.slug ? "" : item.slug)} className={colorStyles.option}><span aria-hidden="true" className={`catalog-color-sample ${colorStyles.sample}`} style={catalogColorSwatchStyle(item.label)}/><span>{productColorDisplayLabel(item.label)}</span></button>)}
            </div>}
          </div>;
        })}
      </div></details>}
      {Object.entries(facets).filter(([key,values]) => key !== "Gender" && values.length > 0).map(([key,values]) => <details className="catalog-filter-section" key={key}><summary>{key}<ChevronDown size={18}/></summary><label><input type="radio" name={key} checked={!selected[key]} onChange={() => onFacetChange(key,"")}/>Semua</label>{values.map(value => <label key={value}><input type="radio" name={key} checked={selected[key] === value} onChange={() => onFacetChange(key,value)}/><span>{value}</span></label>)}</details>)}
    </aside>
  </details>;
}
