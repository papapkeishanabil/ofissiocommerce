// src/components/product/ProductDetail.tsx

"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Product } from "@/types/product";
import { formatIDR } from "@/types/product";
import { fulfillmentLabel } from "@/types/industry";
import { emptySizeMatrix } from "@/types/cart";
import { getModel3DForProduct } from "@/data/uniform-3d";
import type { SizeMatrix } from "@/types/industry";
import { useCartStore } from "@/stores/cart-store";
import { useOfistantStore } from "@/stores/ofistant-store";
import { useUIStore } from "@/stores/ui-store";
import { afterConfirmItemAdded } from "@/lib/ofistant/ofistant.rules";
import {
  ArrowLeft,
  CheckCircle2,
  Layers,
  Minus,
  Plus,
  Ruler,
  Shirt,
  Sparkles,
  Truck,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ProductImagePlaceholder } from "@/components/catalog/ProductImagePlaceholder";
import { SmartFloatingPreview } from "@/features/product-preview/components/SmartFloatingPreview";
import { ProductPreviewModal } from "@/features/product-preview/components/ProductPreviewModal";
import { useFloatingPreviewState } from "@/features/product-preview/hooks/useFloatingPreviewState";
import { useProductHeroVisibility } from "@/features/product-preview/hooks/useProductHeroVisibility";
import { SizeQuantityMatrix } from "./SizeQuantityMatrix";

// Lazy-load the 3D configurator (R3F + three.js bundle) so it only ships
// when the customer actually opens the 3D tab on a supported product.
const Uniform3DConfigurator = dynamic(
  () =>
    import("@/components/configurator/Uniform3DConfigurator").then(
      (m) => m.Uniform3DConfigurator,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-64 place-items-center rounded-2xl border border-line bg-surface-muted">
        <div className="text-xs text-ink-muted">Memuat konfigurator 3D…</div>
      </div>
    ),
  },
);

interface ProductDetailProps {
  product: Product;
}

const COLOR_SWATCHES: Record<string, string> = {
  Navy: "#1e3a8a",
  Black: "#0f172a",
  White: "#f8fafc",
  "Orange Safety": "#f97316",
  "Lime Safety": "#84cc16",
  Yellow: "#facc15",
  Khaki: "#a16207",
  "Dark Green": "#166534",
  "Royal Blue": "#1d4ed8",
  Maroon: "#7f1d1d",
  "Light Blue": "#7dd3fc",
  Pink: "#fbcfe8",
  Grey: "#94a3b8",
  "Dark Grey": "#475569",
  "Ceil Blue": "#7dd3fc",
  Teal: "#0d9488",
  Wine: "#9f1239",
  Charcoal: "#334155",
  Olive: "#4d7c0f",
  Burgundy: "#7f1d1d",
};

export function ProductDetail({ product }: ProductDetailProps) {
  const [color, setColor] = useState<string>(product.colors[0] ?? "Default");
  const [sizes, setSizes] = useState<SizeMatrix>(() => emptySizeMatrix());
  const [customization, setCustomization] = useState<string>("");
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uniform3DConfig, setUniform3DConfig] =
    useState<import("@/types/uniform-3d").Uniform3DConfig | null>(null);
  const [show3D, setShow3D] = useState(false);
  const [showFloatingPreviewModal, setShowFloatingPreviewModal] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const desktopPreviewButtonRef = useRef<HTMLButtonElement>(null);
  const mobilePreviewButtonRef = useRef<HTMLButtonElement>(null);
  const heroVisible = useProductHeroVisibility(heroRef);
  const { isDismissed: floatingPreviewDismissed, dismiss: dismissFloatingPreview } =
    useFloatingPreviewState(product.id);

  const addToCart = useCartStore((s) => s.add);
  const authModalOpen = useUIStore((s) => s.authModalOpen);
  const cartDrawerOpen = useUIStore((s) => s.cartDrawerOpen);
  const product3DModel = useMemo(
    () => getModel3DForProduct(product.id),
    [product.id],
  );
  const has3DSupport = !!product3DModel;

  // Start loading the heavy configurator and GLB while the customer reads the
  // product detail. The modal then opens from the browser + GLTF cache rather
  // than beginning a 3D download only after the click.
  useEffect(() => {
    if (!product3DModel?.glbUrl) return;
    let cancelled = false;

    const preload = async () => {
      const [, viewerModule] = await Promise.all([
        import("@/components/configurator/Uniform3DConfigurator"),
        import("@/components/configurator/Uniform3DViewer"),
      ]);
      if (cancelled) return;
      const { useGLTF } = await import("@react-three/drei");
      useGLTF.preload(product3DModel.glbUrl!);
      // Keep the module reference alive through this task so bundlers do not
      // treat the viewer import as an unused speculative request.
      void viewerModule;
    };

    const timer = window.setTimeout(() => void preload(), 80);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [product3DModel?.glbUrl]);

  // Sync Ofistant context: this product is now the "selected" one, and the
  // user's color/size choices are reflected so Ofistant can pre-fill an
  // ADD_TO_CART action with the right payload.
  useEffect(() => {
    useOfistantStore.getState().setContext({
      selectedProductId: product.id,
      selectedProductSlug: product.slug,
      selectedColor: color,
      sizeMatrix: sizes,
      journeyStage: "CONFIGURING_PRODUCT",
      viewedProductIds: [
        product.id,
        ...useOfistantStore
          .getState()
          .context.viewedProductIds.filter((id) => id !== product.id),
      ].slice(0, 12),
    });
  }, [product.id, product.slug, color, sizes]);

  function notifyOfistantPostAdd(name: string) {
    useOfistantStore.setState((s) => ({
      context: afterConfirmItemAdded(s.context),
      messages: [
        ...s.messages,
        {
          id: `assistant-add-${Date.now()}`,
          role: "assistant" as const,
          text: `Produk ${name} sudah ditambahkan ke keranjang. Apakah ingin lanjut mencari produk pelengkap?`,
          ts: Date.now(),
        },
      ],
      quickReplies: ["Lanjut eksplor produk", "Lihat keranjang", "Checkout"],
    }));
  }

  const totalQty = useMemo(
    () => Object.values(sizes).reduce((a, b) => a + (b || 0), 0),
    [sizes],
  );
  const estimatedPrice = totalQty * product.priceFrom;
  const meetsMoq = totalQty >= product.moq;
  const snapshotUrl = uniform3DConfig?.snapshots.front ?? Object.values(uniform3DConfig?.snapshots ?? {})[0];
  const floatingPreviewOpen =
    !heroVisible &&
    !floatingPreviewDismissed &&
    !show3D &&
    !showFloatingPreviewModal &&
    !authModalOpen &&
    !cartDrawerOpen;
  const floatingPreviewData = {
    product,
    color,
    totalQty,
    embroideryCount: uniform3DConfig?.placements.length ?? 0,
    snapshotUrl,
  };

  function closeFloatingPreviewModal() {
    setShowFloatingPreviewModal(false);
    requestAnimationFrame(() => {
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      (isDesktop ? desktopPreviewButtonRef.current : mobilePreviewButtonRef.current)?.focus();
    });
  }

  function handleAdd() {
    const result = addToCart({
      product,
      color,
      sizes,
      customization: customization.trim() || null,
      uniform3DConfig: uniform3DConfig ?? null,
    });
    if (!result.ok) {
      setError(result.reason ?? "Gagal menambahkan ke keranjang.");
      setAdded(false);
      return;
    }
    setError(null);
    setAdded(true);
    if (result.lineId) {
      notifyOfistantPostAdd(product.name);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
      <Breadcrumbs
        items={[
          { label: "Beranda", href: "/" },
          { label: "Katalog", href: "/catalog" },
          ...(product.industries[0]
            ? [
                {
                  label: product.industries[0],
                  href: `/catalog?industri=${encodeURIComponent(product.industries[0])}`,
                },
              ]
            : []),
          { label: product.name },
        ]}
      />
      <ButtonLink
        href="/catalog"
        variant="ghost"
        size="sm"
        className="mb-4 mt-2 -ml-2 lg:hidden"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke katalog
      </ButtonLink>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-8">
        {/* Left: gallery + info */}
        <div className="space-y-4">
          <div ref={heroRef} className="space-y-4">
            <ProductImagePlaceholder
              name={product.name}
              accentColor={product.accentColor}
              category={product.category}
              variant="detail"
              className="aspect-[4/3] w-full rounded-2xl border border-line"
            />

            {/* Thumbnails (dummy) */}
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((i) => (
                <ProductImagePlaceholder
                  key={i}
                  name={product.name}
                  accentColor={product.accentColor}
                  category={product.category}
                  className="aspect-square w-full rounded-lg border border-line opacity-70"
                />
              ))}
            </div>
          </div>

          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-sm font-bold text-ink">Deskripsi</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              {product.description}
            </p>

            <h3 className="mt-5 text-sm font-bold text-ink">Spesifikasi</h3>
            <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {product.specs.map((s) => (
                <div
                  key={s.label}
                  className="flex items-center justify-between border-b border-line py-1.5 text-sm"
                >
                  <dt className="text-ink-muted">{s.label}</dt>
                  <dd className="font-semibold text-ink">{s.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <Shirt className="h-4 w-4 text-brand-700" />
              <span className="text-ink-muted">Bahan:</span>
              <span className="font-semibold text-ink">{product.material}</span>
            </div>
          </section>
        </div>

        {/* Right: configurator (sticky) */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-20">
            {/* Title block */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                  {product.category}
                </p>
                <h1 className="mt-1 text-xl font-bold leading-tight text-ink lg:text-2xl">
                  {product.name}
                </h1>
                <p className="mt-1 font-mono text-xs text-ink-muted">
                  SKU: {product.sku}
                </p>
              </div>
              <Badge
                tone={product.fulfillment === "READY_STOCK" ? "success" : "amber"}
              >
                {fulfillmentLabel(product.fulfillment)}
              </Badge>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {product.industries.map((ind) => (
                <Badge key={ind} tone="neutral">
                  {ind}
                </Badge>
              ))}
            </div>

            {/* Price + MOQ + lead time */}
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
              <Stat
                icon={<span className="text-sm font-bold">Rp</span>}
                label="Mulai dari"
                value={formatIDR(product.priceFrom)}
              />
              <Stat
                icon={<Layers className="h-4 w-4" />}
                label="MOQ"
                value={`${product.moq} pcs`}
              />
              <Stat
                icon={<Truck className="h-4 w-4" />}
                label="Lead time"
                value={`${product.leadTimeDays} hari`}
              />
            </div>

            {/* Color picker */}
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Warna: <span className="text-ink">{color}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => {
                  const active = c === color;
                  const swatch = COLOR_SWATCHES[c] ?? "#cbd5e1";
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      aria-label={`Pilih warna ${c}`}
                      aria-pressed={active}
                      title={c}
                      className={
                        "relative h-8 w-8 rounded-full border shadow-sm transition " +
                        (active
                          ? "ring-2 ring-brand-600 ring-offset-2"
                          : "border-line hover:scale-110")
                      }
                      style={{ backgroundColor: swatch }}
                    >
                      {active && (
                        <CheckCircle2
                          className="absolute inset-0 m-auto h-4 w-4 text-white mix-blend-difference"
                          strokeWidth={3}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Size matrix */}
            <div className="mt-5">
              <SizeQuantityMatrix
                value={sizes}
                onChange={setSizes}
                moq={product.moq}
                sizeChart={product.sizeChart}
              />
            </div>

            {/* Size chart reference */}
            <details className="mt-3 rounded-lg border border-line bg-surface-muted px-3 py-2 text-sm">
              <summary className="flex cursor-pointer items-center gap-2 font-semibold text-ink">
                <Ruler className="h-4 w-4" />
                Lihat size chart lengkap
              </summary>
              <table className="mt-3 w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-ink-muted">
                    <th className="py-1">Ukuran</th>
                    <th className="py-1">Lingkar Dada (cm)</th>
                    <th className="py-1">Panjang (cm)</th>
                  </tr>
                </thead>
                <tbody>
                  {product.sizeChart.map((row) => (
                    <tr key={row.size} className="border-b border-line/60">
                      <td className="py-1 font-semibold text-ink">{row.size}</td>
                      <td className="py-1">{row.chest > 0 ? row.chest : "—"}</td>
                      <td className="py-1">{row.length > 0 ? row.length : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>

            {/* Customization: 3D configurator for supported products,
                plain-text notes for the rest. */}
            {has3DSupport ? (
              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  onClick={() => setShow3D(true)}
                  className="flex w-full items-center justify-between rounded-xl border border-brand-200 bg-brand-50/40 px-4 py-2.5 text-left transition-all hover:border-brand-400 hover:bg-brand-50"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-brand-700" />
                    <span className="text-xs font-bold text-brand-800">
                      Preview 3D &amp; Bordir Logo
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    {uniform3DConfig && uniform3DConfig.placements.length > 0 && (
                      <span className="rounded-full bg-ochre-500 px-2 py-0.5 text-[9px] font-bold text-white">
                        {uniform3DConfig.placements.length} bordir
                      </span>
                    )}
                    <span className="text-[10px] font-semibold text-brand-700">Buka</span>
                  </span>
                </button>

                {uniform3DConfig && uniform3DConfig.placements.length > 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-[11px]">
                    {uniform3DConfig.snapshots.front && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={uniform3DConfig.snapshots.front}
                        alt="Snapshot 3D"
                        className="h-10 w-10 rounded border border-line object-cover"
                      />
                    )}
                    <span className="text-ink-muted">
                      {uniform3DConfig.placements.length} titik bordir dikonfigurasi.
                    </span>
                    <button
                      type="button"
                      onClick={() => setUniform3DConfig(null)}
                      className="ml-auto text-[10px] font-semibold text-red-600 hover:underline"
                    >
                      Hapus
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-line bg-surface-muted p-3">
                <p className="flex items-center gap-1.5 text-xs font-bold text-ink">
                  <Sparkles className="h-3.5 w-3.5 text-brand-700" />
                  Catatan kustomisasi
                </p>
                <input
                  type="text"
                  value={customization}
                  onChange={(e) => setCustomization(e.target.value)}
                  placeholder="cth: bordir logo di dada kiri, 8cm"
                  maxLength={120}
                  className="mt-2 h-9 w-full rounded-lg border border-line bg-surface px-3 text-xs text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
            )}

            {/* Total + CTA */}
            <div className="mt-5 border-t border-line pt-4">
              <div className="flex items-end justify-between">
                <span className="text-xs text-ink-muted">Estimasi harga</span>
                <div className="text-right">
                  <p className="text-xl font-bold text-ink">
                    {formatIDR(estimatedPrice)}
                  </p>
                  <p className="text-[11px] text-ink-muted">
                    {totalQty} pcs × {formatIDR(product.priceFrom)}
                  </p>
                </div>
              </div>

              {error && (
                <p role="alert" className="mt-3 text-xs text-red-600">
                  {error}
                </p>
              )}

              <div className="mt-3 grid grid-cols-1 gap-2">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleAdd}
                  disabled={!meetsMoq || totalQty === 0}
                >
                  {meetsMoq ? (
                    <>
                      <Plus className="h-4 w-4" /> Tambahkan ke Keranjang
                    </>
                  ) : totalQty === 0 ? (
                    "Pilih quantity dulu"
                  ) : (
                    `MOQ belum tercapai (kurang ${product.moq - totalQty})`
                  )}
                </Button>
                <ButtonLink
                  href="/cart"
                  size="lg"
                  variant="outline"
                  className="w-full"
                >
                  Request Quotation (placeholder)
                </ButtonLink>
              </div>

              {added && (
                <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Ditambahkan ke keranjang. Lihat panel Ofistant untuk opsi
                  berikutnya.
                </p>
              )}
            </div>
          </div>

          {/* Trust row */}
          <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-ink-muted">
            <TrustItem icon={<Truck className="h-4 w-4" />} text="Tracking produksi & kirim" />
            <TrustItem icon={<Shirt className="h-4 w-4" />} text="Bordir logo kustom" />
            <TrustItem icon={<Layers className="h-4 w-4" />} text="Size matrix fleksibel" />
          </div>
        </div>
      </div>

      {/* 3D configurator modal — full-screen so the canvas gets real width
          on every viewport. Lazy-loaded; only mounts when customer opens it. */}
      <SmartFloatingPreview
        data={floatingPreviewData}
        open={floatingPreviewOpen}
        onDismiss={dismissFloatingPreview}
        onPreview={() => setShowFloatingPreviewModal(true)}
        desktopPreviewButtonRef={desktopPreviewButtonRef}
        mobilePreviewButtonRef={mobilePreviewButtonRef}
      />

      <ProductPreviewModal
        data={floatingPreviewData}
        open={showFloatingPreviewModal}
        has3DSupport={has3DSupport}
        onClose={closeFloatingPreviewModal}
        onOpen3D={() => {
          setShowFloatingPreviewModal(false);
          setShow3D(true);
        }}
      />

      {show3D && (
        <div
          className="fixed inset-0 z-[70] flex flex-col bg-slate-100 lg:left-[400px]"
          role="dialog"
          aria-modal="true"
          aria-label="Konfigurator 3D bordir"
        >
          <div className="flex items-center justify-between border-b border-brand-900/10 bg-surface px-4 py-3 shadow-soft-xs lg:px-7">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-700 text-xs font-black text-white shadow-sm shadow-brand-700/20">
                3D
              </div>
              <div>
                <p className="type-display text-[15px] font-bold text-ink">
                  Studio Bordir
                </p>
                <p className="text-[11px] text-ink-muted">{product.name}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShow3D(false)}
              aria-label="Tutup konfigurator"
              className="grid h-9 w-9 place-items-center rounded-xl border border-line text-ink-muted transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,_#eef4ff,_#f8fafc_42%,_#eef2f8)] p-3 sm:p-5 lg:p-7">
            <div className="mx-auto w-full max-w-7xl">
              <Uniform3DConfigurator
                product={product}
                initialColor={color}
                onSave={(cfg) => {
                  setUniform3DConfig(cfg);
                  setShow3D(false);
                }}
                onCancel={() => setShow3D(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-brand-700">{icon}</span>
      <span className="text-[10px] uppercase tracking-wide text-ink-muted">
        {label}
      </span>
      <span className="text-xs font-bold text-ink">{value}</span>
    </div>
  );
}

function TrustItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-line bg-surface px-2 py-2">
      <span className="text-brand-700">{icon}</span>
      <span className="leading-tight">{text}</span>
    </div>
  );
}
