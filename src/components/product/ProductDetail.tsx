// src/components/product/ProductDetail.tsx

"use client";
import { ProductSizeChart } from "./ProductSizeChart";
import { garmentReference } from "@/components/configurator/garment-scale";

import { productColorDisplayLabel } from "@/lib/product-colors";
import { colorVariantGallery, selectedColorVariant } from "@/features/products/color-variants";
import { isColorOption, isSizeOption, isSleeveOption, selectedVariantPrice, matchingProductVariant } from "@/features/products/product-variants";
import { selectedSleeveSizeChart, type SleeveSizeCharts } from "@/features/size-charts/sleeve-size-charts";
import { sleeveOptions } from "@/features/products/purchase-variants";
import { linkedProductVariant, linkedVariantSizes } from "@/features/products/product-variant-links";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { formatIDR } from "@/types/product";
import type { OfissioProduct } from "@/features/products/product.types";
import { validateProduct3DModel } from "@/features/products/product.validation";
import { calculateQuantityTierPrice } from "@/features/products/quantity-pricing";
import { calculateEmbroideryPricing, type EmbroideryPricing } from "@/features/products/embroidery-pricing";
import { resolveProduct3DUrl } from "@/features/products/product-3d-url.client";
import { fulfillmentLabel } from "@/types/industry";
import { emptySizeMatrix } from "@/types/cart";
import { hasEmbroideryRequest, resolveLineMoqIssue } from "@/features/products/moq-rules";
import { resolveOrderProcessingInfo } from "@/features/products/order-processing";
import type { MoqSettings } from "@/features/moq-settings/moq-settings.types";
import { DEFAULT_MOQ_SETTINGS } from "@/features/moq-settings/moq-settings.types";
import { getModel3DForProduct } from "@/data/uniform-3d";
import type { SizeMatrix } from "@/types/industry";
import { useCartStore } from "@/stores/cart-store";
import { useOfistantStore } from "@/stores/ofistant-store";
import { useUIStore } from "@/stores/ui-store";
import { afterConfirmItemAdded } from "@/lib/ofistant/ofistant.rules";
import {
  ArrowLeft,
  Box,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Layers,
  Minus,
  PackageCheck,
  Ruler,
  Shirt,
  Sparkles,
  ShoppingCart,
  Truck,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SmartFloatingPreview } from "@/features/product-preview/components/SmartFloatingPreview";
import { ProductPreviewModal } from "@/features/product-preview/components/ProductPreviewModal";

import { useFloatingPreviewState } from "@/features/product-preview/hooks/useFloatingPreviewState";
import { useProductHeroVisibility } from "@/features/product-preview/hooks/useProductHeroVisibility";
import { SizeQuantityMatrix } from "./SizeQuantityMatrix";
import { ProductGallery } from "./ProductGallery";
import { ProductColorPicker } from "./ProductColorPicker";
import styles from "./ProductDetailTheme.module.css";
import orderStyles from "./ProductOrderFields.module.css";
import { StudioShell } from "@/components/configurator/StudioShell";

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
  sleeveSizeCharts?: SleeveSizeCharts;
  initialVariantSku?: string;
  pricingUnavailable?: boolean;
  purchasingUnavailable?: boolean;
  product: OfissioProduct;
  globalEmbroideryPricing: EmbroideryPricing;
  moqSettings?: MoqSettings;
  /** Nama standar ukuran yang terpasang (dari master kategori) untuk judul panduan. */
  sizeChartStandardName?: string;
}



export function ProductDetail({ product, initialVariantSku, globalEmbroideryPricing, moqSettings, sizeChartStandardName, sleeveSizeCharts, pricingUnavailable = false, purchasingUnavailable = false }: ProductDetailProps) {
  const router = useRouter();
  const generic = product.productKind === "variable";
  const defaultGeneric = linkedProductVariant(product, initialVariantSku) ?? product.productVariants?.find(v => v.sku === product.defaultVariantSku) ?? product.productVariants?.[0];
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => Object.fromEntries((product.variantOptions ?? []).filter(o => !isSizeOption(o.name)).map(o => [o.name, defaultGeneric?.options[o.name] ?? o.values[0] ?? ""])));
  const sleeves = useMemo(() => product.productKind ? [] : sleeveOptions(product), [product]);
  const [selectedSleeve, setSelectedSleeve] = useState(sleeves[0] || "");
  const sleeveOption = product.variantOptions?.find(option => isSleeveOption(option.name));
  const activeSizeChart = sleeveSizeCharts ? selectedSleeveSizeChart(sleeveSizeCharts, sleeveOption ? selectedOptions[sleeveOption.name] : selectedSleeve || product.sleeve_type) : null;
  const sizeChartRows = sleeveSizeCharts ? activeSizeChart?.rows ?? [] : product.sizeChart;
  const activeSizeChartName = sleeveSizeCharts ? activeSizeChart?.standard.name : sizeChartStandardName;
  const [color, setColor] = useState<string>(() => {
    const colorOption = product.variantOptions?.find(o => isColorOption(o.name));
    return generic && colorOption ? defaultGeneric?.options[colorOption.name] ?? colorOption.values[0] ?? "Default" : product.defaultColor && product.colors.includes(product.defaultColor) ? product.defaultColor : product.colors[0] || "Default";
  });
  const [sizes, setSizes] = useState<SizeMatrix>(() => ({ ...emptySizeMatrix(), ...linkedVariantSizes(product, initialVariantSku) }));
  const activeGenericVariant = generic ? matchingProductVariant(product, selectedOptions, Object.entries(sizes).find(([, q]) => q > 0)?.[0]) ?? product.productVariants?.find(row => Object.entries(selectedOptions).every(([name, value]) => row.options[name] === value)) : undefined;
  const galleryImages = useMemo(() => {
    if (!activeGenericVariant?.imageSrc) return colorVariantGallery(product, color);
    return [{ id: null, src: activeGenericVariant.imageSrc, name: product.name, alt: product.name }, ...(product.images ?? []).filter(image => image.src !== activeGenericVariant.imageSrc)];
  }, [product, color, activeGenericVariant?.imageSrc]);
  const galleryProduct = useMemo(() => ({ ...product, images: galleryImages }), [product, galleryImages]);
  let selectedRegularPrice = product.priceFrom;
  try { if (generic) selectedRegularPrice = Object.values(sizes).some(q => q > 0) ? selectedVariantPrice(product, selectedOptions, sizes) : activeGenericVariant?.regularPrice ?? product.priceFrom; } catch { /* Cart validation reports mixed prices or unavailable combinations. */ }
  const [customization, setCustomization] = useState<string>("");
  const [added, setAdded] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uniform3DConfig, setUniform3DConfig] =
    useState<import("@/types/uniform-3d").Uniform3DConfig | null>(null);
  const [show3D, setShow3D] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | undefined>();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const line = useCartStore.getState().items.find(item => item.id === params.get("line") && item.productId === product.id);
    if (line) { setEditingLineId(line.id); setSizes(line.sizes); setColor(line.color); setSelectedSleeve(line.selectedSleeve || sleeves[0] || ""); if (line.selectedOptions) setSelectedOptions(line.selectedOptions); setUniform3DConfig(line.uniform3DConfig || null); }
    if (params.get("studio") === "1" && product.supports_embroidery && validateProduct3DModel(product).ok) {
      setShow3D(true);
    }
  }, [product, sleeves]);
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
    () => {
      if (!product.model_3d || !validateProduct3DModel(product).ok) return undefined;
      const registered = getModel3DForProduct(product.id);
      return {
        referenceLengthCm: garmentReference(product.sku)?.lengthCm,
        productId: product.id,
        model3dId: product.model_3d.id,
        glbUrl: product.model_3d.url,
        orientationY: product.model_3d.orientationY ?? registered?.orientationY ?? 0,
        photo360: registered?.photo360 ?? null,
        depth3D: registered?.depth3D ?? null,
        depth3DDual: registered?.depth3DDual ?? null,
        depth3DQuad: registered?.depth3DQuad ?? null,
        fallbackColor: registered?.fallbackColor ?? product.accentColor,
        adjustment: {
          exposure: product.model_3d.exposure ?? 1.15,
          emissiveIntensity: product.model_3d.emissiveIntensity ?? 0.6,
          brightness: product.model_3d.brightness ?? 1,
          saturation: product.model_3d.saturation ?? 1,
          hue: product.model_3d.hue ?? 0,
          temperature: product.model_3d.temperature ?? 0,
        },
      };
    },
    [product],
  );

  useEffect(() => {
    if (!show3D) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShow3D(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [show3D]);
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
      const resolvedUrl = await resolveProduct3DUrl(product3DModel.glbUrl!);
      if (cancelled) return;
      const { configureStudioGLTFLoader } = await import("@/components/configurator/configure-gltf-loader");
      if (cancelled) return;
      useGLTF.preload(resolvedUrl, "/draco/", true, configureStudioGLTFLoader);
      // Keep the module reference alive through this task so bundlers do not
      // treat the viewer import as an unused speculative request.
      void viewerModule;
    };

    const timer = window.setTimeout(() => void preload().catch(() => undefined), 80);
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
  const quantityPrice = useMemo(
    () => calculateQuantityTierPrice({
      regularPrice: selectedRegularPrice,
      totalQty,
      quantityPricing: product.quantityPricing,
    }),
    [selectedRegularPrice, product.quantityPricing, totalQty],
  );
  const embroideryPrice = useMemo(
    () => calculateEmbroideryPricing({
      totalQty,
      selectedZones: uniform3DConfig?.placements.map((placement) => placement.zone) ?? [],
      productSupportedZones: product.embroidery_zones,
      globalEmbroideryPricing,
    }),
    [globalEmbroideryPricing, product.embroidery_zones, totalQty, uniform3DConfig?.placements],
  );
  const estimatedPrice = quantityPrice.subtotal + embroideryPrice.total;
  const entryTier = useMemo(() => {
    const tiers = product.quantityPricing?.enabled
      ? product.quantityPricing.tiers
      : [];
    if (!tiers.length) return null;
    return tiers.reduce((earliest, tier) =>
      tier.minQty < earliest.minQty ? tier : earliest,
    );
  }, [product.quantityPricing]);
  const lowestTier = useMemo(() => {
    const tiers = product.quantityPricing?.enabled
      ? product.quantityPricing.tiers
      : [];
    if (!tiers.length) return null;
    return tiers.reduce((lowest, tier) =>
      tier.unitPrice < lowest.unitPrice ? tier : lowest,
    );
  }, [product.quantityPricing]);
  const entryPrice = entryTier?.unitPrice ?? selectedRegularPrice;
  // Satu helper MOQ bersama dengan cart-store/checkout: MOQ produk + batas
  // keras bordir (8 pcs default) bila line ini meminta bordir.
  const lineHasEmbroidery = hasEmbroideryRequest({
    uniform3DPlacements: uniform3DConfig?.placements,
    customization,
  });
  const lineMoqIssue = resolveLineMoqIssue({
    productMoq: product.moq,
    totalQty,
    hasEmbroidery: lineHasEmbroidery,
    embroideryMoq: moqSettings?.embroidery,
  });
  const embroideryMoq = moqSettings?.embroidery ?? DEFAULT_MOQ_SETTINGS.embroidery;
  const processingInfo = resolveOrderProcessingInfo({
    processRoute: product.processRoute,
    fulfillmentType: product.fulfillment,
    leadTimeDays: product.leadTimeDays,
    hasEmbroidery: lineHasEmbroidery,
  });
  const snapshotUrl = uniform3DConfig?.snapshots.front ?? Object.values(uniform3DConfig?.snapshots ?? {})[0];
  const floatingPreviewOpen =
    !heroVisible &&
    !floatingPreviewDismissed &&
    !show3D &&
    !showFloatingPreviewModal &&
    !authModalOpen &&
    !cartDrawerOpen;
  const floatingPreviewData = {
    product: { ...galleryProduct, mainImage: galleryImages[0]?.src ?? product.mainImage },
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

  function addProductToCart(
    configOverride: import("@/types/uniform-3d").Uniform3DConfig | null,
  ) {
    if (purchasingUnavailable || (pricingUnavailable && configOverride?.placements.length)) {
      setError("Informasi pemesanan belum tersedia. Muat ulang halaman untuk mencoba lagi.");
      return false;
    }
    const result = addToCart({
      replaceLineId: editingLineId,
      product,
      color: configOverride?.color ?? color,
      selectedSleeve: selectedSleeve || undefined,
      selectedOptions: generic ? { ...selectedOptions, ...Object.fromEntries((product.variantOptions ?? []).filter(o => isColorOption(o.name)).map(o => [o.name, configOverride?.color ?? color])) } : undefined,
      sizes,
      customization: customization.trim() || null,
      uniform3DConfig: configOverride,
      globalEmbroideryPricing,
      moqSettings,
    });
    if (!result.ok) {
      setError(result.reason ?? "Gagal menambahkan ke keranjang.");
      setAdded(false);
      return false;
    }
    setError(null);
    setAdded(true);
    if (result.lineId) {
      notifyOfistantPostAdd(product.name);
    }
    return true;
  }

  function handleAdd() {
    addProductToCart(uniform3DConfig);
  }

  function handleStudioAdd(config: import("@/types/uniform-3d").Uniform3DConfig) {
    setUniform3DConfig(config);
    setColor(config.color);
    if (addProductToCart(config)) setShow3D(false);
  }

  return (
    <div className={`${styles.page} product-detail-page min-h-full w-full px-3 pb-5 sm:px-5 lg:px-6 xl:px-8`}>
      {(pricingUnavailable || purchasingUnavailable) && <div role="status" className="mx-auto my-3 flex max-w-[1680px] flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><p>{purchasingUnavailable ? "Informasi minimum pesanan belum tersedia. Pemesanan sementara tidak dapat dilanjutkan." : "Tarif bordir belum dapat dimuat. Anda tetap bisa melihat produk; pemesanan dengan bordir menunggu tarif tersedia."}</p><button type="button" className="font-semibold underline" onClick={() => router.refresh()}>Coba lagi</button></div>}
      <div className="commerce-breadcrumb-row mx-auto flex w-full max-w-[1680px] flex-wrap items-center gap-x-3 gap-y-2">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>
        <Breadcrumbs
          items={[
            { label: "Beranda", href: "/" },
            { label: "Katalog", href: "/catalog" },
            { label: product.name },
          ]}
        />
      </div>

      <div className="mx-auto grid w-full max-w-[1680px] min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.32fr)_minmax(430px,0.68fr)] xl:gap-6 2xl:grid-cols-[minmax(0,1.38fr)_minmax(470px,0.62fr)]">
        {/* Left: gallery + info */}
        <div className="contents xl:block xl:space-y-4">
          <div ref={heroRef} className="order-1">
            <ProductGallery
              key={`${product.id}-${color}`}
              product={galleryProduct}
              immersive
              has3DSupport={has3DSupport}
              onOpen3D={() => setShow3D(true)}
            />
          </div>

          <section className={`${styles.description} order-3 p-5 sm:p-6 xl:order-none`}>
            <h2 className="type-display text-lg font-bold text-brand-900">Deskripsi Produk</h2>
            {product.descriptionHtml ? (
              // HTML sudah tersanitasi di jalur server (repository) sebelum
              // sampai ke sini; tipografi diatur class .rich-text.
              <div
                className="rich-text mt-3 max-w-3xl text-[15px] leading-7 text-ink-muted"
                dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
              />
            ) : (
              <p className="mt-3 max-w-3xl whitespace-pre-line text-[15px] leading-7 text-ink-muted">
                {product.description}
              </p>
            )}

            <h3 className="type-display mt-6 text-base font-bold text-brand-900">Spesifikasi Produk</h3>
            <dl className="mt-1 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {product.specs
                .filter((spec) => spec.label.trim().toLowerCase() !== "lead time" || processingInfo.kind === "production")
                .map((s) => (
                <div
                  key={s.label}
                  className="flex items-start justify-between gap-4 border-b border-line py-2 text-sm"
                >
                  <dt className="text-ink-muted">{s.label.trim().toLowerCase() === "lead time" ? "Estimasi produksi" : s.label}</dt>
                  <dd className="text-right font-semibold text-ink">
                    {s.label.trim().toLowerCase() === "lead time"
                      ? processingInfo.value
                      : ["warna", "color"].includes(s.label.trim().toLowerCase())
                        ? productColorDisplayLabel(s.value)
                        : s.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        {/* Right: configurator (sticky) */}
        <div className="order-2 space-y-4 xl:order-none xl:sticky xl:top-5">
          <div className={`${styles.purchase} storefront-product-panel`}>
            {/* Title block */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-ochre-700">
                  {product.category}
                </p>
                <h1 className="storefront-product-title mt-1 font-bold leading-tight tracking-tight text-ink">
                  {product.name}
                </h1>
                <p className="mt-1 font-mono text-xs text-ink-muted">
                  {generic ? `Model: ${product.modelCode || "—"}` : `SKU: ${selectedColorVariant(product, color)?.sku || product.sku}`}
                  {generic && Object.values(sizes).some(q => q > 0) && activeGenericVariant ? <span className="mt-1 block">SKU: {activeGenericVariant.sku}</span> : null}
                </p>
              </div>
              <Badge
                className="shrink-0 whitespace-nowrap"
                tone={product.fulfillment === "READY_STOCK" ? "success" : "amber"}
              >
                {fulfillmentLabel(product.fulfillment)}
              </Badge>
            </div>

            {/* Harga utama menampilkan tier masuk, bukan harga tier termurah. */}
            <div className={styles.price}>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-muted">
                Harga saat ini
              </p>
              <p className="storefront-product-price mt-1 font-bold leading-tight tracking-tight text-ink">
                {generic && !activeGenericVariant ? "Kombinasi tidak tersedia" : <>{formatIDR(entryPrice)} <span className="text-base font-bold tracking-normal">/ pcs</span></>}
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg bg-[#eff4ff] px-2 py-1.5 text-xs font-bold text-brand-900">
                <span>{entryTier?.label ?? `Mulai ${Math.max(1, product.moq)} pcs`}</span>
                {lowestTier && lowestTier.unitPrice < entryPrice ? (
                  <span className="font-semibold text-ink-muted">
                    Mulai {formatIDR(lowestTier.unitPrice)} / pcs untuk {lowestTier.label}
                  </span>
                ) : null}
              </div>
            </div>

            <div className={`${styles.stats} grid grid-cols-2 gap-2`}>
              <Stat
                icon={<Layers className="h-5 w-5" />}
                label={product.moq <= 1 ? "Min. Beli" : "MOQ"}
                value={`${Math.max(1, product.moq)} pcs`}
              />
              <Stat
                icon={processingInfo.kind === "ready_stock"
                  ? <PackageCheck className="h-5 w-5" />
                  : <Clock3 className="h-5 w-5" />}
                label={processingInfo.label}
                value={processingInfo.value}
              />
            </div>

            {product.quantityPricing?.enabled && product.quantityPricing.tiers.length > 1 ? (
              <details className="border-b border-[#dbe3f1] py-2 text-xs">
                <summary className="cursor-pointer font-bold text-brand-900">Lihat semua harga bertingkat</summary>
                <dl className="mt-3 grid gap-x-5 gap-y-2 sm:grid-cols-2">
                  {product.quantityPricing.tiers.map((tier) => (
                    <div key={`${tier.minQty}-${tier.maxQty ?? "plus"}`} className="flex items-center justify-between border-b border-[#dbe3f1] py-2 text-xs">
                      <dt className="font-semibold text-ink-muted">{tier.label}</dt>
                      <dd className="font-bold text-brand-900">{formatIDR(tier.unitPrice)} / pcs</dd>
                    </div>
                  ))}
                </dl>
              </details>
            ) : null}

            {!generic && product.productKind !== "simple" && <ProductColorPicker product={product} color={color} onChange={setColor} />}
            {generic && product.variantOptions?.filter(option => !isSizeOption(option.name)).map(option => isColorOption(option.name) ? (
              <ProductColorPicker key={option.name} product={product} color={selectedOptions[option.name] ?? color} selectedOptions={selectedOptions} onChange={value => {
                setSelectedOptions(current => ({ ...current, [option.name]: value }));
                setColor(value);
                setSizes(emptySizeMatrix());
                setError(null);
              }} />
            ) : <fieldset key={option.name} className="mt-3">
              <legend className="text-xs font-bold text-ink">{option.name}</legend>
              <div className="mt-2 flex flex-wrap gap-2">{option.values.map(value => <button key={value} type="button" aria-pressed={selectedOptions[option.name] === value} className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${selectedOptions[option.name] === value ? "border-brand-700 bg-surface-muted" : "border-line bg-surface"}`} onClick={() => { setSelectedOptions(current => ({ ...current, [option.name]: value })); if (isColorOption(option.name)) setColor(value); setSizes(emptySizeMatrix()); setError(null); }}>{value}</button>)}</div>
            </fieldset>)}
            {sleeves.length > 0 && <fieldset className="mt-3">
              <legend className="text-xs font-bold text-ink">Jenis lengan</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {sleeves.map(sleeve => <button key={sleeve} type="button" aria-pressed={selectedSleeve === sleeve}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold ${selectedSleeve === sleeve ? "border-ochre-600 bg-surface-muted" : "border-line bg-surface"}`}
                  onClick={() => { setSelectedSleeve(sleeve); setSizes(emptySizeMatrix()); setError(null); }}>
                  {sleeve.toLocaleLowerCase("id-ID").replace(/(^|\s)\S/g, letter => letter.toUpperCase())}
                </button>)}
              </div>
            </fieldset>}

            {/* Size matrix */}
            <div className="mt-3">
              <SizeQuantityMatrix
                emphasized
                productId={product.id}
                availableSizes={product.available_sizes}
                color={color}
                selectedSleeve={selectedSleeve || undefined}
                selectedOptions={generic ? selectedOptions : undefined}
                value={sizes}
                onChange={setSizes}
                moq={product.moq}
                sizeChart={sizeChartRows}
                embroideryMoq={embroideryMoq}
                hasEmbroidery={lineHasEmbroidery}
              />
            </div>

            {/* Size chart reference — expand inline di panel pembelian,
                hanya saat standar ukuran terpasang. */}
            {sizeChartRows.length > 0 && product.available_sizes.some(size => size !== "OS") && (
              <div className={orderStyles.guide}>
                <button
                  type="button"
                  onClick={() => setShowSizeChart((open) => !open)}
                  aria-expanded={showSizeChart}
                  aria-controls={`size-guide-${product.id}`}
                  aria-label={showSizeChart ? "Sembunyikan size chart" : "Lihat size chart lengkap"}
                  className={orderStyles.guideButton}
                >
                  <span className={orderStyles.guideIcon}><Ruler className="h-5 w-5" aria-hidden="true" /></span>
                  <span className={orderStyles.guideCopy}><strong>{showSizeChart ? "Sembunyikan size chart" : "Lihat size chart lengkap"}</strong><small>Cek ukuran sebelum memesan.</small></span>
                  <ChevronRight
                    className={`ml-auto h-4 w-4 transition-transform${showSizeChart ? " rotate-90" : ""}`}
                    aria-hidden="true"
                  />
                </button>
                <div id={`size-guide-${product.id}`} hidden={!showSizeChart} className={orderStyles.guideContent}>{showSizeChart && <ProductSizeChart rows={sizeChartRows} name={activeSizeChartName} />}</div>
              </div>
            )}

            {/* Customization: 3D configurator for supported products,
                plain-text notes for the rest. */}
            {has3DSupport && product.supports_embroidery ? (
              <div className="mt-3 space-y-3">
                <button
                  type="button"
                  onClick={() => setShow3D(true)}
                  className="group flex min-h-[60px] w-full items-center gap-3 rounded-xl border border-ochre-600 bg-white px-3 py-2 text-left transition-colors hover:bg-ochre-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-500"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#eff4ff]">
                    {product.images?.[0]?.src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.images[0].src} alt="" className="h-full w-full object-contain p-1" />
                    ) : (
                      <Box className="h-7 w-7 text-brand-700" aria-hidden="true" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-base font-bold text-brand-900">Tambah Bordir</span>
                      <span className="inline-flex rounded-full bg-ochre-100 px-2 py-0.5 text-[11px] font-bold text-ochre-800">
                        Min. pemesanan {embroideryMoq} pcs
                      </span>
                    </span>
                    <span className="mt-1 block text-sm text-ink-muted">
                      Preview desain bebas dicoba sebelum menentukan jumlah.
                    </span>
                    {uniform3DConfig && uniform3DConfig.placements.length > 0 && (
                      <span className="mt-2 inline-flex rounded-full bg-ochre-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        {uniform3DConfig.placements.length} bordir
                      </span>
                    )}
                  </span>
                  <ChevronRight className="h-6 w-6 shrink-0 text-brand-900 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </button>

                {product.model_3d && (
                  <div className="sr-only">
                    <span>Model: <strong className="text-ink">{product.model_3d.filename}</strong></span>
                    <span>Versi: <strong className="text-ink">{product.model_3d.version}</strong></span>
                    <span>Sumber: <strong className="capitalize text-ink">{product.model_3d.source}</strong></span>
                  </div>
                )}

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
              <div className={orderStyles.notes}>
                <div className={orderStyles.notesHeading}>
                  <label htmlFor={`order-note-${product.id}`}><Sparkles className="h-4 w-4" aria-hidden="true" />Catatan pesanan</label>
                  <span>Opsional</span>
                </div>
                <p id={`order-note-help-${product.id}`}>Tambahkan kebutuhan khusus untuk pesanan ini.</p>
                <textarea
                  id={`order-note-${product.id}`}
                  aria-describedby={`order-note-help-${product.id} order-note-count-${product.id}`}
                  value={customization}
                  onChange={(e) => setCustomization(e.target.value)}
                  placeholder="Contoh: pisahkan kemasan berdasarkan ukuran."
                  maxLength={120}
                  rows={3}
                />
                <span id={`order-note-count-${product.id}`} className={orderStyles.noteCount}>{customization.length} / 120 karakter</span>
              </div>
            )}

            {/* Total + CTA */}
            <div className="mt-5 border-t border-line pt-4">
              {embroideryPrice.lines.length > 0 ? (
                <div className="mb-4 space-y-2 rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                  <div className="flex justify-between text-[11px]"><span className="font-semibold text-ink-muted">Subtotal produk</span><strong className="text-ink">{formatIDR(quantityPrice.subtotal)}</strong></div>
                  {embroideryPrice.lines.map((line) => (
                    <div key={line.zoneId} className="flex items-start justify-between gap-3 text-[11px]">
                      <div><p className="font-semibold text-ink">{line.label}</p><p className="text-ink-muted">{line.quantity} pcs × {formatIDR(line.unitPrice)}{line.setupFeeApplied ? ` + setup ${formatIDR(line.setupFee)}` : ""}</p></div>
                      <strong className="text-ink">{formatIDR(line.subtotal)}</strong>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-amber-200 pt-2 text-xs font-bold text-amber-950"><span>Total bordir</span><span>{formatIDR(embroideryPrice.total)}</span></div>
                </div>
              ) : null}
              {embroideryPrice.missingPricingZones.length > 0 ? <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">Harga bordir untuk zona ini perlu dikonfirmasi admin.</p> : null}
              <div className="flex items-end justify-between">
                <span className="text-xs text-ink-muted">Estimasi produk + bordir</span>
                <div className="text-right">
                  <p className="text-xl font-bold text-ink">
                    {formatIDR(estimatedPrice)}
                  </p>
                  <p className="text-[11px] text-ink-muted">
                    {totalQty} pcs × {formatIDR(quantityPrice.unitPrice)}
                  </p>
                  {quantityPrice.tierApplied && quantityPrice.tierLabel ? (
                    <p className="mt-1 text-[10px] font-bold text-brand-700">Tier {quantityPrice.tierLabel}</p>
                  ) : null}
                </div>
              </div>

              {quantityPrice.nextTier ? (
                <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800">
                  Tambah {quantityPrice.nextTier.qtyToNextTier} pcs lagi untuk harga {formatIDR(quantityPrice.nextTier.potentialUnitPrice)} / pcs.
                </p>
              ) : null}

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
                  disabled={lineMoqIssue != null || totalQty === 0}
                >
                  {lineMoqIssue == null ? (
                    <>
                      <ShoppingCart className="h-4 w-4" /> Tambahkan ke Keranjang
                    </>
                  ) : totalQty === 0 ? (
                    "Pilih quantity dulu"
                  ) : lineMoqIssue.code === "EMBROIDERY_MOQ" ? (
                    `Bordir min. ${lineMoqIssue.requiredQty} pcs (kurang ${lineMoqIssue.shortfall})`
                  ) : (
                    `MOQ belum tercapai (kurang ${lineMoqIssue.shortfall})`
                  )}
                </Button>
                <ButtonLink
                  href="/cart"
                  size="lg"
                  variant="outline"
                  className="w-full"
                >
                  Tinjau keranjang
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

            {/* Kept inside the purchase card so it never slides underneath
                the CTA when the product workspace scrolls. */}
            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-line pt-4 sm:grid-cols-3">
              <TrustItem icon={<Truck className="h-4 w-4" />} text="Tracking produksi & kirim" />
              <TrustItem icon={<Shirt className="h-4 w-4" />} text="Bordir logo kustom" />
              <TrustItem icon={<Layers className="h-4 w-4" />} text="Size matrix fleksibel" />
            </div>
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

        {show3D && has3DSupport && product.supports_embroidery && (
        <StudioShell product={product} onClose={() => setShow3D(false)}>              <Uniform3DConfigurator
                orderUnavailableReason={pricingUnavailable || purchasingUnavailable ? "Informasi pemesanan belum dapat dimuat. Kembali ke produk dan pilih Coba lagi sebelum menambahkan ke keranjang." : undefined}
                sizes={sizes}
                onSizesChange={setSizes}
                product={product}
                embroideryPricing={globalEmbroideryPricing}
                embroideryMoq={embroideryMoq}
                initialColor={color}
                initialConfig={uniform3DConfig}
                selectedSleeve={selectedSleeve || undefined}
                selectedOptions={generic ? selectedOptions : undefined}
                onSave={(cfg) => {
                  if (editingLineId && !addProductToCart(cfg)) return;
                  setUniform3DConfig(cfg);
                  setColor(cfg.color);
                  if (generic) setSelectedOptions(current => ({ ...current, ...Object.fromEntries((product.variantOptions ?? []).filter(o => isColorOption(o.name)).map(o => [o.name, cfg.color])) }));
                  setShow3D(false);
                }}
                onCancel={() => setShow3D(false)}
                priceLabel={`${formatIDR(entryPrice)} / pcs`}
                onAddToCart={handleStudioAdd}
              />
        </StudioShell>
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
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
      <span className="text-brand-700 [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
      <span className="text-[10px] tracking-wide text-ink-muted">
        {label}
      </span>
      <span className="text-xs font-bold text-ink">{value}</span>
    </div>
  );
}

function TrustItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
        {icon}
      </span>
      <span className="pt-0.5 text-[11px] font-semibold leading-snug text-ink-muted">
        {text}
      </span>
    </div>
  );
}
