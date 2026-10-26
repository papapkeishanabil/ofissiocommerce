"use client";

import Link from "next/link";
import { ProductVariantEditor } from "./ProductVariantEditor";
import { detachVariantImage, resolveVariantImage } from "../variant-image-references";
import { productVariantsSchema, isColorOption, isSizeOption, type ProductVariantInput, type VariantOption } from "../product-variants";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Box, Calculator, CheckCircle2, FileBox, ImageIcon, Loader2, PackagePlus, Plus, RotateCcw, Save, Settings2, Shirt, SunMedium, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";

import type { CatalogAttribute, CatalogCategory, IndustryMaster } from "@/features/catalog-taxonomy/catalog-taxonomy.types";
import type { AdminWooCommerceProductDetail } from "@/features/products/woocommerce/woocommerce-product-admin.types";
import {
  ProductImageManager,
  type ProductImageManagerHandle,
} from "./ProductImageManager";
import {
  createDefaultQuantityPricingTier,
  quantityTierLabel,
  validateQuantityPricing,
} from "@/features/products/quantity-pricing";
import {
  WOO_EMBROIDERY_ZONES,
  WOO_FULFILLMENT_TYPES,
  WOO_PROCESS_ROUTES,
  WOO_PRODUCT_STATUSES,
  WOO_REPLENISHMENT_POLICIES,
  WOO_MODEL_ORIENTATION_Y_OPTIONS,
  WOO_TRANSACTION_MODES,
  type AdminWooProductInput,
} from "@/features/products/woocommerce/woocommerce-product-management.types";
import type { MoqSettings } from "@/features/moq-settings/moq-settings.types";
import type { Model3DEntry } from "@/data/uniform-3d";
import { clearResolvedProduct3DUrlCache } from "@/features/products/product-3d-url.client";
import { defaultModelOrientationY } from "@/types/uniform-3d";
import { DEFAULT_MODEL_COLOR_ADJUSTMENT, normalizeModelColorAdjustment, type ModelColorAdjustment } from "@/types/model-color-adjustment";
import { productColorDisplayLabel, productColorSwatchStyle } from "@/lib/product-colors";
import { ColorVariantEditor } from "./ColorVariantEditor";
import { colorKey, updateVariantModelAdjustment, type ColorVariantInput } from "../color-variants";
import { adminColorVariantsSchema } from "../woocommerce/color-variants.validation";
import type { AdminProductImage } from "../woocommerce/woocommerce-product-admin.types";

// Preview 3D live untuk penyesuaian warna — bundle three.js hanya dimuat
// saat panel dibuka (produk dengan model GLB).
const ModelPreviewCanvas = dynamic(
  () => import("@/components/configurator/Uniform3DViewer").then((m) => m.Uniform3DViewer),
  { ssr: false },
);

// Editor WYSIWYG deskripsi — bundle TipTap hanya dimuat saat form admin
// dirender (form ini hanya dipakai route /admin/products/*), ssr:false
// menjaga initial JS admin tetap ringan.
const RichTextField = dynamic(
  () => import("./RichTextField").then((m) => m.RichTextField),
  { ssr: false, loading: () => <div className="h-36 animate-pulse rounded-lg bg-slate-100" /> },
);

interface AdminProductFormProps {
  mode: "create" | "edit";
  product?: AdminWooCommerceProductDetail;
  options: {
    categories: CatalogCategory[];
    industries: IndustryMaster[];
    attributes: CatalogAttribute[];
  };
  productImageMaxMb?: number;
  glbMaxMb?: number;
  routeMoqDefaults?: MoqSettings;
}

interface ApiProductResponse {
  ok?: boolean;
  message?: string;
  product?: AdminWooCommerceProductDetail;
}

interface ApiGlbUploadResponse {
  ok?: boolean;
  message?: string;
  detail?: AdminWooCommerceProductDetail;
  upload?: {
    filename: string;
    version: string;
    modelId: string;
    sizeBytes: number;
    uploadedAt: string;
  };
}

const ZONE_LABELS: Record<string, string> = {
  left_chest: "Dada kiri",
  right_chest: "Dada kanan",
  left_sleeve: "Lengan kiri",
  right_sleeve: "Lengan kanan",
  upper_back: "Punggung atas",
  center_back: "Punggung tengah",
};

const MOCK_INTERNAL_HEADERS = {
  "x-ofissio-internal-role": "super_admin",
  "x-ofissio-internal-user-id": "internal-dev",
};

export function AdminProductForm({ mode, product, options, productImageMaxMb = 10, glbMaxMb = 50, routeMoqDefaults }: AdminProductFormProps) {
  const router = useRouter();
  const imageManagerRef = useRef<ProductImageManagerHandle>(null);
  const initial = useMemo(() => initialForm(product, routeMoqDefaults), [product, routeMoqDefaults]);
  const [form, setForm] = useState<AdminWooProductInput>(initial);
  const [genericOptions, setGenericOptions] = useState<VariantOption[]>(product?.variantOptions ?? []);
  const [genericVariants, setGenericVariants] = useState<ProductVariantInput[]>(product?.productVariants ?? []);
  const [defaultGenericSku, setDefaultGenericSku] = useState(product?.defaultVariantSku || product?.productVariants?.[0]?.sku || "");
  function changeProductKind(kind: "simple" | "variable") {
    if (kind === "simple" && product && (product.productVariants?.length || product.purchaseVariants?.length || product.colorVariants?.length)) { setMessage({ tone: "error", text: "Produk ini sudah memiliki varian tersimpan. Buat produk baru jika memerlukan satu SKU tanpa varian." }); return; }
    if (kind === "simple" && genericVariants.length && !window.confirm("Pengaturan varian belum tersimpan tidak akan digunakan. Lanjutkan tanpa varian?")) return;
    setForm(current => ({ ...current, productKind: kind, modelCode: current.modelCode || current.sku, ...(kind === "simple" ? { colors: current.colors.slice(0, 1), sizes: ["OS"] } : {}) }));
    setVariantsEnabled(false);
  }
  const [variantsEnabled, setVariantsEnabled] = useState(product?.colorVariantsEnabled ?? false);
  const [variantDrafts, setVariantDrafts] = useState<ColorVariantInput[]>(product?.colorVariants ?? []);
  const [defaultVariantColor, setDefaultVariantColor] = useState(product?.defaultColor ?? "");
  const [previewVariantColor, setPreviewVariantColor] = useState("");
  const [variantImages, setVariantImages] = useState<AdminProductImage[]>(product?.images ?? []);
  const resolvedVariantImages = useRef<Record<string, string>>({});
  const visibleVariants = form.colors.map((color) => variantDrafts.find((row) => colorKey(row.color) === colorKey(color)) ?? {
    color, sku: `${form.sku}-${color.trim().replace(/\s+/g, "-")}`, imageSrc: "", stockQuantity: null,
  });
  const selectedDefaultColor = form.colors.includes(defaultVariantColor) ? defaultVariantColor : form.colors[0] ?? "";
  const previewColor = form.colors.includes(previewVariantColor) ? previewVariantColor : selectedDefaultColor;
  const previewVariant = variantsEnabled ? visibleVariants.find((variant) => variant.color === previewColor) : undefined;
  const previewImage = previewVariant?.imageSrc || form.imageUrls[0];
  const [glbFile, setGlbFile] = useState<File | null>(null);
  const [glbVersion, setGlbVersion] = useState(product?.ofissioMeta.model3DVersion || "v1");
  const [activeGlb, setActiveGlb] = useState(() => ({
    filename: product?.ofissioMeta.model3DFilename ?? "",
    version: product?.ofissioMeta.model3DVersion ?? "",
    updatedAt: product?.ofissioMeta.model3DUpdatedAt ?? "",
  }));
  const [glbInputKey, setGlbInputKey] = useState(0);
  const [glbUploadError, setGlbUploadError] = useState<string | null>(null);
  const [workingProductId, setWorkingProductId] = useState<number | null>(product?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "warning" | "error"; text: string } | null>(null);
  const [showPricingValidation, setShowPricingValidation] = useState(false);
  // MOQ hanya auto-mengikuti rute selama admin belum menyentuhnya manual.
  const [moqTouched, setMoqTouched] = useState(false);

  const pricingValidation = useMemo(
    () => validateQuantityPricing({
      enabled: form.quantityPricingEnabled,
      tiers: form.quantityPricingTiers,
      moq: form.moq,
    }),
    [form.moq, form.quantityPricingEnabled, form.quantityPricingTiers],
  );

  // Preview penyesuaian warna 3D — hanya untuk produk yang punya model GLB.
  const previewAdjustment = useMemo(() => normalizeModelColorAdjustment(previewVariant?.modelAdjustment ?? {
    exposure: form.model3dExposure,
    emissiveIntensity: form.model3dEmissive,
    brightness: form.model3dBrightness,
    saturation: form.model3dSaturation,
    hue: form.model3dHue,
    temperature: form.model3dTemperature,
  }), [previewVariant?.modelAdjustment, form.model3dExposure, form.model3dEmissive, form.model3dBrightness, form.model3dSaturation, form.model3dHue, form.model3dTemperature]);

  const colorPreviewModel = useMemo<Model3DEntry | null>(() => {
    const baseGlbUrl =
      product?.ofissioMeta.model3DUrl ||
      (product?.id ? `/api/products/woocommerce/${product.id}/3d-model/signed-url` : "");
    if (!baseGlbUrl) return null;
    // ?preview= berubah setiap upload GLB baru sehingga viewer me-resolve ulang
    // (melewati cache modul + THREE.Cache) alih-alih memakai URL identik.
    const glbUrl = activeGlb.updatedAt
      ? `${baseGlbUrl}?preview=${encodeURIComponent(activeGlb.updatedAt)}`
      : baseGlbUrl;
    return {
      productId: product?.id?.toString() ?? "admin-preview",
      model3dId: "admin-color-preview",
      glbUrl,
      orientationY: form.model3dRotationY ?? defaultModelOrientationY(form.sku),
      photo360: null,
      depth3D: null,
      depth3DDual: null,
      depth3DQuad: null,
      fallbackColor: "#d9c39a",
      adjustment: previewAdjustment,
    };
  }, [
    product,
    activeGlb.updatedAt,
    previewAdjustment,
    form.model3dRotationY,
    form.sku,
  ]);

  const set = <K extends keyof AdminWooProductInput>(key: K, value: AdminWooProductInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  function setPreviewAdjustment(key: keyof ModelColorAdjustment, value: number) {
    if (variantsEnabled && previewVariant) {
      setVariantDrafts((current) => updateVariantModelAdjustment(current, previewVariant, { [key]: value }, previewAdjustment));
      return;
    }
    const fields = {
      exposure: "model3dExposure", emissiveIntensity: "model3dEmissive",
      brightness: "model3dBrightness", saturation: "model3dSaturation",
      hue: "model3dHue", temperature: "model3dTemperature",
    } as const;
    set(fields[key], value);
  }

  function selectGlbFile(file: File | null) {
    setGlbUploadError(null);
    if (!file) {
      setGlbFile(null);
      return;
    }
    const sizeMb = file.size / 1024 / 1024;
    if (sizeMb > glbMaxMb) {
      setGlbFile(null);
      setGlbInputKey((current) => current + 1);
      setGlbUploadError(
        `File ${file.name} berukuran ${sizeMb.toFixed(2).replace(".", ",")} MB. Batas Storage saat ini ${glbMaxMb} MB. Kompres GLB terlebih dahulu atau naikkan batas Supabase Storage.`,
      );
      return;
    }
    setGlbFile(file);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.productKind && form.colors.length > 1 && !variantsEnabled && !product?.purchaseVariants?.length) {
      setMessage({ tone: "error", text: "Produk dengan beberapa warna memerlukan SKU per warna. Aktifkan pengaturan SKU dan foto per warna terlebih dahulu." });
      document.getElementById("color-variants")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (form.productKind === "variable") {
      const parsed = productVariantsSchema.safeParse({ options: genericOptions, variants: genericVariants, defaultVariantSku: defaultGenericSku });
      if (!parsed.success) { setMessage({ tone: "error", text: parsed.error.issues[0]?.message || "Lengkapi varian produk." }); return; }
      const missingPhoto = genericVariants.find(row => row.imageSrc && !variantImages.some(image => image.src === resolveVariantImage(row.imageSrc, resolvedVariantImages.current)));
      if (missingPhoto) { setMessage({ tone: "error", text: `Foto untuk ${missingPhoto.sku} sudah tidak ada di galeri. Pilih foto pengganti di Varian Produk atau pilih Gunakan foto utama, lalu terapkan ke semua ukuran. Produk belum disimpan.` }); return; }
    }
    if (!form.productKind && variantsEnabled) {
      const result = adminColorVariantsSchema.safeParse({ variants: visibleVariants, defaultColor: selectedDefaultColor });
      const missingImage = visibleVariants.find((variant) => !variantImages.some((image) => image.src === variant.imageSrc));
      const parentSkuUsed = visibleVariants.some((variant) => colorKey(variant.sku) === colorKey(form.sku));
      if (!visibleVariants.length || !result.success || missingImage || parentSkuUsed) {
        setMessage({ tone: "error", text: !visibleVariants.length ? "Pilih warna pada bagian Katalog dan atribut." : parentSkuUsed ? "SKU varian harus berbeda dari SKU produk induk." : missingImage ? `Pilih foto galeri untuk warna ${missingImage.color}.` : result.error?.issues[0]?.message ?? "Lengkapi varian warna." });
        document.getElementById("color-variants")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }
    setShowPricingValidation(true);
    if (!pricingValidation.valid) {
      setMessage({ tone: "error", text: pricingValidation.errors[0]?.message ?? "Tier harga quantity belum valid." });
      document.getElementById("quantity-pricing")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    // Editor WYSIWYG tidak punya clamp maxLength native textarea — zod tetap
    // menjadi otoritas server, ini guard UX di client.
    if (form.shortDescription.trim().length > 2000 || form.description.trim().length > 20000) {
      setMessage({ tone: "error", text: "Deskripsi melebihi batas karakter (singkat maks. 2.000 / lengkap maks. 20.000)." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const targetId = workingProductId;
      const response = await fetch(
        targetId ? `/api/admin/products/woocommerce/${targetId}` : "/api/admin/products/woocommerce",
        {
          method: targetId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...MOCK_INTERNAL_HEADERS,
          },
          body: JSON.stringify(form.productKind === "variable" ? {
            ...form,
            colors: genericOptions.find(o => isColorOption(o.name))?.values ?? (form.colors.length ? form.colors : ["Default"]),
            sizes: genericOptions.find(o => isSizeOption(o.name))?.values ?? ["OS"],
          } : form.productKind === "simple" ? { ...form, colors: form.colors.length ? form.colors : ["Default"], sizes: ["OS"] } : form),
        },
      );
      const payload = (await response.json().catch(() => null)) as ApiProductResponse | null;
      if (!response.ok || !payload?.product) {
        throw new Error(payload?.message || "Produk belum dapat disimpan.");
      }
      const saved = payload.product;
      setWorkingProductId(saved.id);
      const uploadWarnings: string[] = [];
      let uploadedGlbLabel = "";
      let uploadedGlb: ApiGlbUploadResponse["upload"];
      let variantsFailed = false;

      try {
        const savedImages = await imageManagerRef.current?.save(saved.id);
        if (savedImages) {
          set("imageUrls", savedImages.map((image) => image.src));
        }
      } catch {
        uploadWarnings.push("foto gagal diupload");
      }

      if (form.productKind === "variable") {
        try {
          if (uploadWarnings.length) throw new Error("Foto belum berhasil disimpan. Simpan kembali setelah upload berhasil.");
          const variants = genericVariants.map(row => ({ ...row, imageSrc: resolveVariantImage(row.imageSrc, resolvedVariantImages.current) }));
          setGenericVariants(variants);
          const response = await fetch(`/api/admin/products/woocommerce/${saved.id}/variants`, {
            method: "PATCH", headers: { "Content-Type": "application/json", ...MOCK_INTERNAL_HEADERS },
            body: JSON.stringify({ options: genericOptions, variants, defaultVariantSku: defaultGenericSku }),
          });
          const result = await response.json();
          if (!response.ok || !result.ok) throw new Error(result.message || "Varian belum tersimpan.");
          setGenericVariants(result.variants);
        } catch (error) {
          variantsFailed = true;
          uploadWarnings.push(`varian gagal: ${error instanceof Error ? error.message : "Simpan ulang varian."}`);
        }
      }
      if (!form.productKind && (variantsEnabled || product?.colorVariantsEnabled || saved.colorVariantsEnabled)) {
        try {
          if (uploadWarnings.length) throw new Error("Foto belum berhasil disimpan. Simpan kembali setelah upload foto berhasil.");
          const variants = variantsEnabled ? visibleVariants.map((variant) => ({ ...variant, imageSrc: resolvedVariantImages.current[variant.imageSrc] ?? variant.imageSrc })) : [];
          // Preserve uploaded photo references even if the provider rejects a SKU.
          setVariantDrafts(variants);
          const response = await fetch(`/api/admin/products/woocommerce/${saved.id}/color-variants`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Accept: "application/json", ...MOCK_INTERNAL_HEADERS },
            body: JSON.stringify({ variants, defaultColor: selectedDefaultColor }),
          });
          const result = await response.json().catch(() => null) as { ok?: boolean; message?: string; variants?: ColorVariantInput[] } | null;
          if (!response.ok || !result?.ok || !result.variants) throw new Error(result?.message || "Varian warna belum tersimpan.");
          setVariantDrafts(result.variants);
        } catch (error) {
          variantsFailed = true;
          uploadWarnings.push(`varian warna gagal: ${error instanceof Error ? error.message : "Simpan ulang varian."}`);
        }
      }

      if (glbFile) {
        setGlbUploadError(null);
        const data = new FormData();
        data.set("file", glbFile);
        data.set("version", glbVersion || "v1");
        const uploadResponse = await fetch(
          `/api/admin/products/woocommerce/${saved.id}/3d-model`,
          {
            method: "POST",
            body: data,
            headers: { Accept: "application/json", ...MOCK_INTERNAL_HEADERS },
          },
        );
        const uploadPayload = (await uploadResponse.json().catch(() => null)) as ApiGlbUploadResponse | null;
        if (!uploadResponse.ok || !uploadPayload?.upload) {
          const uploadError = uploadPayload?.message || "File GLB belum dapat diunggah.";
          setGlbUploadError(uploadError);
          uploadWarnings.push(
            `GLB gagal: ${uploadError}`,
          );
        } else {
          const uploaded = uploadPayload.upload;
          // GLB baru sudah aktif — hapus URL resolusi tercache agar preview
          // berikutnya mengambil token versi baru dari resolver.
          clearResolvedProduct3DUrlCache();
          setActiveGlb({
            filename: uploaded.filename,
            version: uploaded.version,
            updatedAt: uploaded.uploadedAt,
          });
          setGlbVersion(uploaded.version);
          setGlbFile(null);
          setGlbInputKey((current) => current + 1);
          setGlbUploadError(null);
          uploadedGlbLabel = `${uploaded.filename} (${uploaded.version})`;
          uploadedGlb = uploaded;
        }
      }

      const refreshed = await fetch(`/api/admin/products/woocommerce/${saved.id}`, {
        cache: "no-store",
        headers: { Accept: "application/json", ...MOCK_INTERNAL_HEADERS },
      });
      const refreshedPayload = (await refreshed.json().catch(() => null)) as ApiProductResponse | null;
      const refreshedProduct = refreshedPayload?.product;
      const readiness = refreshedProduct?.readiness ?? saved.readiness;
      if (refreshedProduct) {
        setForm(initialForm(refreshedProduct));
        if (!variantsFailed) {
          setVariantsEnabled(refreshedProduct.colorVariantsEnabled ?? false);
          setVariantDrafts(refreshedProduct.colorVariants ?? []);
          setDefaultVariantColor(refreshedProduct.defaultColor ?? "");
        }
        // Prefer the upload response for this submit. It is authoritative and
        // prevents a briefly stale WooCommerce read from restoring the old
        // filename/version in the form immediately after a replacement.
        if (!uploadedGlb) {
          setActiveGlb({
            filename: refreshedProduct.ofissioMeta.model3DFilename,
            version: refreshedProduct.ofissioMeta.model3DVersion,
            updatedAt: refreshedProduct.ofissioMeta.model3DUpdatedAt,
          });
        }
      }
      if (uploadWarnings.length > 0) {
        setMessage({
          tone: "warning",
          text: `Produk berhasil disimpan, tetapi ${uploadWarnings.join(" dan ")}. Anda dapat retry dari halaman edit.`,
        });
      } else if (readiness.isVisibleInOfissio) {
        setMessage({
          tone: "success",
          text: uploadedGlbLabel
            ? `Produk tersimpan. Model 3D aktif sekarang: ${uploadedGlbLabel}.`
            : "Produk tersimpan dan valid untuk tampil di Ofissio.",
        });
      } else {
        setMessage({
          tone: "warning",
          text: `Produk tersimpan, tetapi belum tampil di Ofissio: ${readiness.blockingIssues.map((issue) => issue.label).join(", ")}.`,
        });
      }
      if (variantsFailed) return;
      if (mode === "create") {
        const warning = uploadWarnings.some((item) => item.startsWith("foto"))
          ? "image"
          : uploadWarnings.length
            ? "glb"
            : "";
        router.replace(
          `/admin/products/woocommerce/${saved.id}?created=1${warning ? `&uploadWarning=${warning}` : ""}`,
        );
      } else {
        router.refresh();
      }
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Produk belum dapat disimpan." });
    } finally {
      setBusy(false);
    }
  }

  async function saveQuantityPricing() {
    if (!workingProductId) {
      setMessage({ tone: "warning", text: "Buat produk terlebih dahulu sebelum menyimpan harga quantity secara terpisah." });
      return;
    }
    setShowPricingValidation(true);
    if (!pricingValidation.valid) {
      setMessage({ tone: "error", text: pricingValidation.errors[0]?.message ?? "Tier harga quantity belum valid." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/admin/products/woocommerce/${workingProductId}/quantity-pricing`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...MOCK_INTERNAL_HEADERS,
          },
          body: JSON.stringify({
            quantityPricingEnabled: form.quantityPricingEnabled,
            quantityPricingMode: form.quantityPricingMode,
            quantityBasis: form.quantityBasis,
            tiers: form.quantityPricingTiers,
            moq: form.moq,
          }),
        },
      );
      const payload = (await response.json().catch(() => null)) as ApiProductResponse | null;
      if (!response.ok || !payload?.product) {
        throw new Error(payload?.message || "Harga quantity belum dapat disimpan.");
      }
      set("quantityPricingTiers", payload.product.ofissioMeta.quantityPricingTiers);
      setMessage({ tone: "success", text: "Harga quantity berhasil disimpan." });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Harga quantity belum dapat disimpan." });
    } finally {
      setBusy(false);
    }
  }

  function updateTier(index: number, patch: Partial<AdminWooProductInput["quantityPricingTiers"][number]>) {
    set("quantityPricingTiers", form.quantityPricingTiers.map((tier, tierIndex) => {
      if (tierIndex !== index) return tier;
      const next = { ...tier, ...patch };
      const generatedBefore = quantityTierLabel(tier.minQty, tier.maxQty);
      if (!tier.label || tier.label === generatedBefore) {
        next.label = quantityTierLabel(next.minQty, next.maxQty);
      }
      return next;
    }));
  }

  function addTier() {
    const tiers = [...form.quantityPricingTiers];
    const last = tiers[tiers.length - 1];
    const suggestedMin = last
      ? [20, 50, 100, 300, 500].find((value) => value > last.minQty) ?? last.minQty + 500
      : form.moq;
    const minQty = last?.maxQty == null ? suggestedMin : last.maxQty + 1;
    if (last && last.maxQty == null) {
      const closedMax = Math.max(last.minQty, minQty - 1);
      tiers[tiers.length - 1] = {
        ...last,
        maxQty: closedMax,
        label: quantityTierLabel(last.minQty, closedMax),
      };
    }
    tiers.push({
      minQty,
      maxQty: null,
      unitPrice: last?.unitPrice || form.regularPrice,
      label: quantityTierLabel(minQty, null),
    });
    set("quantityPricingTiers", tiers);
  }

  function resetQuantityPricing() {
    set("quantityPricingTiers", [
      createDefaultQuantityPricingTier(form.regularPrice, form.moq),
    ]);
    setShowPricingValidation(false);
  }

  return (
    <form
      onSubmit={submit}
      onInvalidCapture={(event) => {
        const input = event.target as HTMLInputElement;
        const details = input.closest("details");
        if (details) details.open = true;
        const label = input.closest("label")?.querySelector("span")?.textContent?.replace(/\*$/, "").trim();
        setMessage({
          tone: "error",
          text: `Produk belum disimpan. Periksa ${label || "kolom wajib"}: ${input.validationMessage} Foto dan model 3D baru diunggah setelah data produk valid.`,
        });
      }}
      className="space-y-5"
    >
      {message ? <StatusMessage {...message} /> : null}

      <FormSection icon={Shirt} title="Jenis Produk" description="Pilih cara produk dijual agar pengisian SKU sesuai dengan stok Anda.">
        <fieldset disabled={busy} className="space-y-3">
          <legend className="sr-only">Jenis produk</legend>
          {(["simple", "variable"] as const).map(kind => <label key={kind} className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-ink">
            <input type="radio" name="product-kind" className="mt-1 h-5 w-5 accent-[var(--color-brand-700)]" checked={form.productKind === kind || !form.productKind && kind === "variable"} onChange={() => changeProductKind(kind)} />
            <span><strong>{kind === "simple" ? "Tanpa varian" : "Dengan varian"}</strong><span className="mt-1 block text-xs leading-5 text-ink-muted">{kind === "simple" ? "Satu SKU untuk produk ini, misalnya KL-003." : "Pilihan warna, ukuran, lengan, saku, atau lainnya. Setiap kombinasi memiliki SKU stok sendiri."}</span></span>
          </label>)}
        </fieldset>
        {!form.productKind && <div className="mt-4 space-y-3"><p className="text-xs leading-5 text-ink-muted">Produk ini memakai pengaturan varian lama. Data dan SKU tetap dipertahankan. Aktifkan editor fleksibel untuk menambahkan jenis pilihan lain.</p><button type="button" disabled={busy} className="min-h-11 rounded-lg border border-line px-4 text-sm font-semibold text-ink" onClick={() => changeProductKind("variable")}>Gunakan editor varian fleksibel</button></div>}
      </FormSection>

      <FormSection icon={PackagePlus} title="Informasi produk" description="Data utama yang akan ditulis langsung ke WooCommerce staging.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Nama produk" required>
            <input className={INPUT} value={form.name} onChange={(e) => set("name", e.target.value)} required maxLength={180} />
          </Field>
          {form.productKind === "variable" ? <Field label="Kode model utama" required hint="Boleh sama antar-series, misalnya SN. SKU katalog dibuat otomatis; SKU stok diisi pada kombinasi varian.">
            <input className={INPUT} value={form.modelCode ?? ""} onChange={e => set("modelCode", e.target.value)} required pattern="[A-Za-z0-9._\-]+" maxLength={80} />
          </Field> : <Field label="SKU" required hint="Isi SKU stok produk, misalnya KL-003. Harus unik.">
            <input className={INPUT} value={form.sku} onChange={(e) => set("sku", e.target.value)} required pattern="[A-Za-z0-9._\-]+" maxLength={100} />
          </Field>}
          <Field label="Slug" hint="Opsional. Kosongkan agar WooCommerce membuat slug otomatis.">
            <input className={INPUT} value={form.slug ?? ""} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} maxLength={180} />
          </Field>
          <Field label="Harga reguler" required>
            <input className={INPUT} type="number" min={1} step={1} value={form.regularPrice} onChange={(e) => {
              const regularPrice = Number(e.target.value);
              setForm((current) => ({
                ...current,
                regularPrice,
                quantityPricingTiers: current.quantityPricingTiers.length === 1 && current.quantityPricingTiers[0]?.unitPrice === 0
                  ? [{ ...current.quantityPricingTiers[0], unitPrice: regularPrice }]
                  : current.quantityPricingTiers,
              }));
            }} required />
          </Field>
          <Field label="Status WooCommerce" required>
            <select className={INPUT} value={form.status} onChange={(e) => set("status", e.target.value as AdminWooProductInput["status"])}>
              {WOO_PRODUCT_STATUSES.map((value) => <option key={value} value={value}>{value === "publish" ? "Publish" : "Draft"}</option>)}
            </select>
          </Field>
          <FieldBlock label="Deskripsi singkat" className="lg:col-span-2" hint="Tulis satu paragraf berisi jenis produk, kegunaan utama, dan pembeda terpenting. Jangan mengulang spesifikasi. Maks. 2.000 karakter.">
            <RichTextField value={form.shortDescription} onChange={(html) => set("shortDescription", html)} maxLength={2000} minHeight={112} placeholder="Ringkasan singkat produk…" />
          </FieldBlock>
          <FieldBlock label="Deskripsi lengkap" className="lg:col-span-2" hint="Format standar: 1–2 paragraf manfaat dan penggunaan, lalu Detail Produk dalam daftar bullet. Material, warna, ukuran, gender, tipe lengan, serta status stok berasal dari spesifikasi dan tidak perlu ditulis ulang. Maks. 20.000 karakter.">
            <RichTextField value={form.description} onChange={(html) => set("description", html)} maxLength={20000} minHeight={176} placeholder="Deskripsi lengkap produk…" />
          </FieldBlock>
        </div>
      </FormSection>

      <FormSection
        icon={FileBox}
        title="Logistik & Pengiriman"
        description="Sumber tunggal berat dan dimensi produk untuk perhitungan ongkir Biteship. Nilai disimpan ke WooCommerce saat produk disimpan."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ShippingNumberField
            label="Berat per pcs"
            unit="gram"
            value={form.weightGram}
            onChange={(value) => set("weightGram", value)}
          />
          <ShippingNumberField
            label="Panjang paket"
            unit="cm"
            value={form.lengthCm}
            onChange={(value) => set("lengthCm", value)}
          />
          <ShippingNumberField
            label="Lebar paket"
            unit="cm"
            value={form.widthCm}
            onChange={(value) => set("widthCm", value)}
          />
          <ShippingNumberField
            label="Tinggi paket"
            unit="cm"
            value={form.heightCm}
            onChange={(value) => set("heightCm", value)}
          />
        </div>
        <p className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-900">
          Isi ukuran paket untuk satu produk setelah dilipat dan dikemas. Checkout mengalikan berat per pcs dengan jumlah pesanan; Biteship menentukan tarif berdasarkan data ini.
        </p>
      </FormSection>

      <FormSection
        icon={ImageIcon}
        title="Foto Produk"
        description="Upload foto utama dan galeri ke WordPress Media; urutannya disinkronkan ke WooCommerce."
      >
        <ProductImageManager
          ref={imageManagerRef}
          productId={workingProductId}
          sku={form.sku || form.modelCode || "produk"}
          initialImages={product?.images ?? []}
          maxFileMb={productImageMaxMb}
          disabled={busy}
          onDraftImagesChange={setVariantImages}
          onImageRemoved={(src) => {
            const affected = genericVariants.some(row => row.imageSrc === src);
            setGenericVariants(current => detachVariantImage(current, src));
            // The legacy color editor requires an explicit photo. Use the remaining
            // main photo when available; its existing validation handles an empty gallery.
            const replacement = variantImages.find(image => image.src !== src)?.src ?? "";
            const affectedColor = variantDrafts.some(row => row.imageSrc === src);
            setVariantDrafts(current => current.map(row => row.imageSrc === src ? { ...row, imageSrc: replacement } : row));
            if (affected || affectedColor) setMessage({ tone: "warning", text: "Foto dihapus dari galeri. Varian yang memakainya sekarang mengikuti foto utama. Pilih foto pengganti di Varian Produk bila diperlukan, lalu simpan perubahan." });
          }}
          onImageSourcesResolved={(sources) => {
            Object.assign(resolvedVariantImages.current, sources);
            setGenericVariants(current => current.map(row => ({ ...row, imageSrc: sources[row.imageSrc] ?? row.imageSrc })));
            setVariantDrafts((current) => current.map((variant) => ({ ...variant, imageSrc: sources[variant.imageSrc] ?? variant.imageSrc })));
          }}
          onImagesChange={(images) =>
            set("imageUrls", images.map((image) => image.src))
          }
        />
        <details className="mt-5 rounded-lg border border-line bg-slate-50 px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-ink">
            Advanced: URL Gambar
          </summary>
          <div className="mt-4">
            <Field
              label="URL gambar produk"
              hint="Untuk debugging saja. Satu URL HTTP/HTTPS per baris; urutan pertama menjadi foto utama."
            >
              <textarea
                className={`${INPUT} min-h-24`}
                value={form.imageUrls.join("\n")}
                onChange={(event) => set("imageUrls", lines(event.target.value))}
                placeholder="https://.../produk.jpg"
              />
            </Field>
          </div>
        </details>
      </FormSection>

      {form.productKind === "variable" && <FormSection icon={Shirt} title="Varian Produk" description="Atur pilihan produk beserta SKU, foto, dan harga yang sesuai.">
        <ProductVariantEditor options={genericOptions} onOptionsChange={setGenericOptions} variants={genericVariants} onChange={setGenericVariants} images={variantImages} regularPrice={form.regularPrice} modelCode={form.modelCode} defaultSku={defaultGenericSku} onDefaultChange={setDefaultGenericSku} disabled={busy} />
      </FormSection>}
      {!form.productKind && <div id="color-variants" className="scroll-mt-28">
        <FormSection icon={Shirt} title="Varian Warna" description="Pasangkan setiap warna dengan SKU dan foto yang sesuai.">
          <ColorVariantEditor
            stockPerSize={product?.colorSizeVariantsEnabled}
            sizeCount={form.sizes.length}
            enabled={variantsEnabled}
            onEnabledChange={setVariantsEnabled}
            variants={visibleVariants}
            onChange={(variant) => setVariantDrafts((current) => [...current.filter((row) => colorKey(row.color) !== colorKey(variant.color)), variant])}
            defaultColor={selectedDefaultColor}
            onDefaultColorChange={setDefaultVariantColor}
            images={variantImages}
            disabled={busy}
          />
        </FormSection>
      </div>}

      <div id="quantity-pricing" className="scroll-mt-28">
        <FormSection
          icon={Calculator}
          title="Harga & Diskon Quantity"
          description="Harga quantity dihitung dari total jumlah pesanan seluruh ukuran, bukan per ukuran."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <Toggle
              label="Aktifkan Harga Quantity"
              description="Jika dinonaktifkan, sistem memakai harga regular WooCommerce."
              checked={form.quantityPricingEnabled}
              onChange={(value) => set("quantityPricingEnabled", value)}
            />
            <Field label="Mode Harga">
              <select className={INPUT} value={form.quantityPricingMode} onChange={(event) => set("quantityPricingMode", event.target.value as AdminWooProductInput["quantityPricingMode"])}>
                <option value="fixed_unit_price">Harga Tetap per Tier Quantity</option>
              </select>
            </Field>
            <Field label="Dasar Perhitungan Quantity">
              <select className={INPUT} value={form.quantityBasis} onChange={(event) => set("quantityBasis", event.target.value as AdminWooProductInput["quantityBasis"])}>
                <option value="total_order_qty">Total Jumlah Pesanan</option>
              </select>
            </Field>
          </div>

          <div className="mt-5 overflow-x-auto rounded-lg border border-line" role="region" aria-label="Tabel tier harga quantity" tabIndex={0}>
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.06em] text-ink-subtle">
                <tr>
                  <th className="px-3 py-3">Min Qty</th>
                  <th className="px-3 py-3">Max Qty</th>
                  <th className="px-3 py-3">Harga / pcs</th>
                  <th className="px-3 py-3">Label Tier</th>
                  <th className="px-3 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-white">
                {form.quantityPricingTiers.map((tier, index) => (
                  <tr key={`${index}-${tier.minQty}`}>
                    <td className="p-2"><input aria-label={`Min Qty tier ${index + 1}`} className={INPUT} type="number" min={1} step={1} value={tier.minQty} onChange={(event) => updateTier(index, { minQty: Number(event.target.value) })} disabled={!form.quantityPricingEnabled} /></td>
                    <td className="p-2"><input aria-label={`Max Qty tier ${index + 1}`} className={INPUT} type="number" min={tier.minQty} step={1} value={tier.maxQty ?? ""} placeholder="Tanpa batas" onChange={(event) => updateTier(index, { maxQty: event.target.value === "" ? null : Number(event.target.value) })} disabled={!form.quantityPricingEnabled} /></td>
                    <td className="p-2"><input aria-label={`Harga per pcs tier ${index + 1}`} className={INPUT} type="number" min={1} step={1} value={tier.unitPrice} onChange={(event) => updateTier(index, { unitPrice: Number(event.target.value) })} disabled={!form.quantityPricingEnabled} /></td>
                    <td className="p-2"><input aria-label={`Label tier ${index + 1}`} className={INPUT} value={tier.label} maxLength={100} onChange={(event) => updateTier(index, { label: event.target.value })} disabled={!form.quantityPricingEnabled} /></td>
                    <td className="p-2 text-right"><button type="button" aria-label={`Hapus tier ${index + 1}`} onClick={() => set("quantityPricingTiers", form.quantityPricingTiers.filter((_, tierIndex) => tierIndex !== index))} disabled={!form.quantityPricingEnabled} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40"><Trash2 className="h-4 w-4" aria-hidden="true" /> Hapus Tier</button></td>
                  </tr>
                ))}
                {form.quantityPricingTiers.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-muted">Harga quantity belum diatur.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {showPricingValidation ? (
            <div className="mt-4 space-y-2" aria-live="polite">
              {pricingValidation.errors.map((issue, index) => <p key={`${issue.code}-${index}`} role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">{issue.message}</p>)}
              {pricingValidation.warnings.map((issue, index) => <p key={`${issue.code}-${index}`} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">{issue.message}</p>)}
              {pricingValidation.info.map((issue, index) => <p key={`${issue.code}-${index}`} className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800">{issue.message}</p>)}
              {pricingValidation.valid && pricingValidation.warnings.length === 0 && pricingValidation.info.length === 0 ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">Tier harga quantity valid.</p> : null}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={addTier} disabled={!form.quantityPricingEnabled} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-40"><Plus className="h-4 w-4" aria-hidden="true" /> Tambah Tier</button>
            <button type="button" onClick={resetQuantityPricing} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-ink hover:bg-slate-50"><RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset dari Harga Regular</button>
            <button type="button" onClick={() => setShowPricingValidation(true)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 text-sm font-semibold text-brand-800 hover:bg-brand-100"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Validasi Tier</button>
            {mode === "edit" ? <button type="button" onClick={() => void saveQuantityPricing()} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-brand-700 bg-white px-4 text-sm font-semibold text-brand-800 hover:bg-brand-50 disabled:opacity-50"><Save className="h-4 w-4" aria-hidden="true" /> Simpan Harga Quantity</button> : null}
          </div>
          <ul className="mt-4 space-y-1 text-xs leading-5 text-ink-muted">
            <li>Harga quantity dihitung dari total jumlah pesanan seluruh ukuran.</li>
            <li>Contoh: S 20 + M 30 + L 50 = total 100 pcs.</li>
            <li>Jika tidak ada tier yang cocok, sistem memakai harga regular WooCommerce.</li>
            <li>Kosongkan Max Qty untuk tier terakhir, misalnya 500+ pcs.</li>
          </ul>
        </FormSection>
      </div>

      <FormSection icon={Settings2} title="Katalog dan atribut" description="Kategori dan industri menentukan filter katalog serta rekomendasi Ofistant.">
        <div className="grid gap-5 xl:grid-cols-2">
          <CheckboxGroup label="Kategori" required options={options.categories.filter((item) => item.active).map((item) => ({ value: String(item.id), label: item.name }))} selected={form.categoryIds.map(String)} onChange={(values) => set("categoryIds", values.map(Number))} />
          <CheckboxGroup label="Industri" required options={options.industries.filter((item) => item.active).map((item) => ({ value: item.slug, label: item.name }))} selected={form.industries} onChange={(values) => set("industries", values)} />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {!(form.productKind === "variable" && genericOptions.some(o => isColorOption(o.name))) && <MasterMultiSelectField
            label="Warna"
            masterSlug="warna"
            value={form.colors}
            onChange={(value) => set("colors", value)}
            attribute={findCatalogAttribute(options.attributes, ["color", "warna"])}
          />}
          {!form.productKind && <MasterMultiSelectField
            label="Ukuran"
            masterSlug="ukuran"
            value={form.sizes}
            onChange={(value) => set("sizes", value)}
            attribute={findCatalogAttribute(options.attributes, ["size", "ukuran"])}
          />}
          <MasterMultiSelectField
            label="Material"
            masterSlug="material"
            required={false}
            value={form.materials}
            onChange={(value) => set("materials", value)}
            attribute={findCatalogAttribute(options.attributes, ["material", "bahan"])}
          />
          <Field label="Gender">
            <select className={INPUT} value={form.gender} onChange={(e) => set("gender", e.target.value as AdminWooProductInput["gender"])}>
              <option value="unisex">Unisex</option><option value="men">Pria</option><option value="women">Wanita</option>
            </select>
          </Field>
          <Field label="Tipe lengan">
            {form.productKind === "variable" && genericOptions.some(o => /^(lengan|tipe lengan|sleeve|sleeve type)$/i.test(o.name.trim())) ? <p className="min-h-11 rounded-lg border border-line bg-slate-50 px-3 py-2 text-sm text-ink">Mengikuti Varian Produk: {genericOptions.find(o => /^(lengan|tipe lengan|sleeve|sleeve type)$/i.test(o.name.trim()))?.values.join(" / ")}</p> : <select className={INPUT} value={form.sleeveType} onChange={(e) => set("sleeveType", e.target.value as AdminWooProductInput["sleeveType"])}>
              <option value="short">Pendek</option><option value="long">Panjang</option>
            </select>}
          </Field>
          <MasterMultiSelectField
            label="Safety Features"
            masterSlug="safety-features"
            required={false}
            value={form.safetyFeatures}
            onChange={(value) => set("safetyFeatures", value)}
            attribute={findCatalogAttribute(options.attributes, ["safety-features", "safety"])}
          />
        </div>
      </FormSection>

      <FormSection icon={Box} title="Aturan B2B dan routing" description="Produk standar tetap dapat dipesan; kekurangan stok ditangani sebagai replenishment internal.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <NumberField label="MOQ" value={form.moq} onChange={(value) => { setMoqTouched(true); set("moq", value); }} />
          <NumberField label={form.processRoute === "production" ? "Estimasi produksi full custom (hari)" : "Estimasi produksi rute PRO (hari)"} value={form.leadTimeDays} onChange={(value) => set("leadTimeDays", value)} />
          <SelectField label="Ketersediaan produk" value={form.fulfillmentType} values={WOO_FULFILLMENT_TYPES} labels={{ READY_STOCK: "Ready Stock", MADE_TO_ORDER: "Dibuat setelah dipesan" }} onChange={(value) => set("fulfillmentType", value as AdminWooProductInput["fulfillmentType"])} />
          <SelectField label="Transaction mode" value={form.transactionMode} values={WOO_TRANSACTION_MODES} onChange={(value) => set("transactionMode", value as AdminWooProductInput["transactionMode"])} />
          <SelectField label="Rute pengerjaan" value={form.processRoute} values={WOO_PROCESS_ROUTES} labels={{ fulfillment: "Ready Stock (STK)", customization: "Custom (CUS)", production: "Production (PRO)" }} onChange={(value) => { set("processRoute", value as AdminWooProductInput["processRoute"]); if (!moqTouched && routeMoqDefaults) set("moq", routeMoqDefaults[value as keyof MoqSettings] ?? form.moq); }} />
          <SelectField label="Replenishment policy" value={form.replenishmentPolicy} values={WOO_REPLENISHMENT_POLICIES} onChange={(value) => set("replenishmentPolicy", value as AdminWooProductInput["replenishmentPolicy"])} />
        </div>
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm text-ink sm:flex-row sm:items-center sm:justify-between">
          <p className="leading-6"><strong>Default MOQ mengikuti master MOQ per rute</strong> (STK/CUS umumnya 1 pcs, PRO mengikuti kebijakan Full Custom); bordir punya batas minimum sendiri yang berlaku otomatis di keranjang. Waktu customer ditampilkan sesuai rute: STK siap diproses, bordir 2–4 hari, dan nilai estimasi di atas hanya untuk produksi full custom (PRO).</p>
          <Link href="/admin/settings/moq" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-brand-700 px-4 font-semibold text-white hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">Kelola Master MOQ</Link>
        </div>
        <div className="mt-4"><Toggle label="Selalu dapat dipesan" description="Customer tidak melihat status out of stock; warning replenishment hanya untuk admin." checked={form.alwaysOrderable} onChange={(value) => set("alwaysOrderable", value)} /></div>
      </FormSection>

      <FormSection icon={Shirt} title="Customization" description="Aktifkan teknik yang didukung dan tentukan zona bordir pada model 3D.">
        <div className="grid gap-3 md:grid-cols-3">
          <Toggle label="Bordir" checked={form.supportsEmbroidery} onChange={(value) => set("supportsEmbroidery", value)} />
          <Toggle label="Sablon" checked={form.supportsScreenPrinting} onChange={(value) => set("supportsScreenPrinting", value)} />
          <Toggle label="DTF" checked={form.supportsDtf} onChange={(value) => set("supportsDtf", value)} />
        </div>
        <div className="mt-5">
          <CheckboxGroup label="Zona bordir" options={WOO_EMBROIDERY_ZONES.map((value) => ({ value, label: ZONE_LABELS[value] ?? value }))} selected={form.embroideryZones} onChange={(values) => set("embroideryZones", values)} disabled={!form.supportsEmbroidery} />
        </div>
        <div className="mt-5 flex flex-col gap-3 rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm text-ink sm:flex-row sm:items-center sm:justify-between">
          <p className="leading-6"><strong>Harga bordir mengikuti master harga bordir global.</strong> Form produk hanya menentukan teknik dan zona yang didukung.</p>
          <Link href="/admin/pricing/embroidery" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-brand-700 px-4 font-semibold text-white hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">Kelola Harga Bordir</Link>
        </div>
        {product?.ofissioMeta.hasLegacyEmbroideryPricing ? <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium leading-5 text-amber-900">Metadata harga bordir lama masih tersimpan di WooCommerce untuk kompatibilitas, tetapi tidak digunakan dalam perhitungan.</p> : null}
      </FormSection>

      <div id="model-3d" className="scroll-mt-28">
      <FormSection icon={FileBox} title="Model 3D GLB" description="File disimpan privat di Supabase Storage. Viewer meminta signed URL baru saat diperlukan.">
        <p className="mb-4 text-xs leading-5 text-ink-muted">Cukup unggah satu model untuk semua warna jika area kainnya sudah disiapkan. Atur warna kain di bagian Varian Warna, lalu cek hasilnya pada preview di bawah.</p>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
          <Field label={activeGlb.filename ? "Ganti file GLB" : "Upload file GLB"} hint={`Hanya .glb, maksimal ${glbMaxMb} MB sesuai batas Storage aktif.`}>
            <input key={glbInputKey} className={`${INPUT} file:mr-4 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand-700`} type="file" accept=".glb,model/gltf-binary,application/octet-stream" onChange={(e) => selectGlbFile(e.target.files?.[0] ?? null)} />
          </Field>
          <Field label="Versi model">
            <input className={INPUT} value={glbVersion} onChange={(e) => setGlbVersion(e.target.value.replace(/[^A-Za-z0-9._-]/g, ""))} required={Boolean(glbFile)} maxLength={40} />
          </Field>
        </div>
        {glbUploadError ? (
          <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-800">
            {glbUploadError}
          </div>
        ) : null}
        {activeGlb.filename ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span className="font-semibold">GLB aktif:</span>
            <span>{activeGlb.filename}, {activeGlb.version}</span>
            {activeGlb.updatedAt ? (
              <span className="text-xs font-normal text-emerald-700">
                diperbarui {formatGlbUpdatedAt(activeGlb.updatedAt)}
              </span>
            ) : null}
          </div>
        ) : null}
        {colorPreviewModel ? (
          <div className="@container mt-4 rounded-xl border border-line bg-slate-50/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-bold text-ink"><SunMedium className="h-4 w-4 text-brand-700" aria-hidden="true" />Penyesuaian Model 3D</p>
                <p className="mt-1 text-xs leading-5 text-ink-muted">
                  {variantsEnabled && previewVariant
                    ? `Penyesuaian warna dan pencahayaan hanya berlaku untuk ${previewColor}. Pilih warna lain untuk mengaturnya secara terpisah. Simpan agar berlaku di Studio Bordir.`
                    : "Cocokkan sisi depan model dengan foto produk, lalu sesuaikan pencahayaannya. Berlaku di Studio Bordir setelah disimpan."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (variantsEnabled && previewVariant) {
                    setVariantDrafts((current) => updateVariantModelAdjustment(current, previewVariant, DEFAULT_MODEL_COLOR_ADJUSTMENT, previewAdjustment));
                    return;
                  }
                  set("model3dRotationY", defaultModelOrientationY(form.sku));
                  set("model3dExposure", DEFAULT_MODEL_COLOR_ADJUSTMENT.exposure);
                  set("model3dEmissive", DEFAULT_MODEL_COLOR_ADJUSTMENT.emissiveIntensity);
                  set("model3dBrightness", DEFAULT_MODEL_COLOR_ADJUSTMENT.brightness);
                  set("model3dSaturation", DEFAULT_MODEL_COLOR_ADJUSTMENT.saturation);
                  set("model3dHue", DEFAULT_MODEL_COLOR_ADJUSTMENT.hue);
                  set("model3dTemperature", DEFAULT_MODEL_COLOR_ADJUSTMENT.temperature);
                }}
                className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-ink-muted transition hover:text-ink"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />Reset
              </button>
            </div>
            <div className="mx-auto max-w-5xl">
            {variantsEnabled && form.colors.length ? <label className="mt-4 block max-w-sm text-sm font-semibold text-ink">Warna preview 3D
              <select className={`${INPUT} mt-2`} value={previewColor} onChange={(event) => setPreviewVariantColor(event.target.value)}>
                {form.colors.map((color) => <option key={color} value={color}>{color}</option>)}
              </select>
            </label> : null}
            <div className="mt-4 grid gap-2 @min-[40rem]:grid-cols-2" aria-label="Perbandingan model 3D dan foto produk">
              <div className="min-w-0 overflow-hidden rounded-lg border border-line bg-white">
                <div className="aspect-[4/5] bg-[#f5f2ec] @min-[40rem]:aspect-auto @min-[40rem]:h-[min(52vh,36rem,60cqw)]">
                  <ModelPreviewCanvas
                    model={colorPreviewModel}
                    color={previewColor || "#d9c39a"}
                    fabricColor={previewVariant?.fabricColor}
                    placements={[]}
                    activeCamera="front"
                  />
                </div>
                <p className="border-t border-line px-4 py-2.5 text-xs font-semibold text-ink-muted">Render 3D (live)</p>
              </div>
              <div className="min-w-0 overflow-hidden rounded-lg border border-line bg-white">
                <div className="aspect-[4/5] @min-[40rem]:aspect-auto @min-[40rem]:h-[min(52vh,36rem,60cqw)]">
                {previewImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewImage} alt={`Foto produk ${previewColor}`} className="h-full w-full bg-white object-contain" />
                ) : (
                  <div className="grid h-full place-items-center text-xs text-ink-muted">Foto produk belum ada</div>
                )}
                </div>
                <p className="border-t border-line px-4 py-2.5 text-xs font-semibold text-ink-muted">Foto produk (referensi)</p>
              </div>
            </div>
            <fieldset className="mt-4">
              <legend className="text-xs font-bold text-ink">Orientasi sisi depan model</legend>
              <p className="mt-1 text-xs leading-5 text-ink-muted">
                Pilih rotasi yang membuat tampilan live menunjukkan bagian depan pakaian. Orientasi berlaku untuk seluruh warna.
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {WOO_MODEL_ORIENTATION_Y_OPTIONS.map((degrees) => {
                  const active = (form.model3dRotationY ?? defaultModelOrientationY(form.sku)) === degrees;
                  return (
                    <button
                      key={degrees}
                      type="button"
                      aria-pressed={active}
                      onClick={() => set("model3dRotationY", degrees)}
                      className={`min-h-10 rounded-lg border px-3 text-xs font-semibold transition ${active ? "border-brand-700 bg-brand-50 text-brand-800 ring-1 ring-brand-700" : "border-line bg-white text-ink-muted hover:border-brand-300"}`}
                    >
                      {degrees}°
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-xs font-bold text-ink">Warna &amp; tone kain</p>
              <p className="mt-1 text-xs leading-5 text-ink-muted">
                Samakan warna kain dengan foto referensi. Pengaturan ini tidak mengubah file GLB asli.
              </p>
              <div className="mt-3 grid gap-x-5 gap-y-4 sm:grid-cols-2">
                <RangeControl
                  label="Kecerahan kain"
                  value={previewAdjustment.brightness}
                  min={0.5}
                  max={1.5}
                  step={0.05}
                  description="Mengubah terang-gelap tekstur tanpa mengubah pencahayaan ruang."
                  onChange={(value) => setPreviewAdjustment("brightness", value)}
                />
                <RangeControl
                  label="Saturasi warna"
                  value={previewAdjustment.saturation}
                  min={0}
                  max={1.5}
                  step={0.05}
                  description="Turunkan bila warna model terlalu pekat dibanding foto."
                  onChange={(value) => setPreviewAdjustment("saturation", value)}
                />
                <RangeControl
                  label="Rona warna"
                  value={previewAdjustment.hue}
                  min={-60}
                  max={60}
                  step={1}
                  formatValue={(value) => `${Math.round(value)}°`}
                  description="Geser rona saat warna dasarnya berbeda, misalnya terlalu jingga."
                  onChange={(value) => setPreviewAdjustment("hue", value)}
                />
                <RangeControl
                  label="Temperatur warna"
                  value={previewAdjustment.temperature}
                  min={-1}
                  max={1}
                  step={0.05}
                  formatValue={formatTemperature}
                  description="Arah negatif lebih dingin; arah positif lebih hangat."
                  onChange={(value) => setPreviewAdjustment("temperature", value)}
                />
              </div>
            </div>
            <details className="mt-4 border-t border-line pt-3">
              <summary className="min-h-10 cursor-pointer py-2 text-xs font-bold text-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
                Pencahayaan lanjutan
              </summary>
              <p className="text-xs leading-5 text-ink-muted">
                Gunakan setelah warna dan tone kain sudah mendekati foto.
              </p>
              <div className="mt-3 grid gap-x-5 gap-y-4 sm:grid-cols-2">
                <RangeControl
                  label="Eksposur render"
                  value={previewAdjustment.exposure}
                  min={0.5}
                  max={1.8}
                  step={0.05}
                  description="Menerangkan atau menggelapkan seluruh hasil render."
                  onChange={(value) => setPreviewAdjustment("exposure", value)}
                />
                <RangeControl
                  label="Cahaya pengisi kain"
                  value={previewAdjustment.emissiveIntensity}
                  min={0}
                  max={1}
                  step={0.05}
                  description="Turunkan bila kain terang terlihat pudar atau tercuci."
                  onChange={(value) => setPreviewAdjustment("emissiveIntensity", value)}
                />
              </div>
            </details>
            </div>
          </div>
        ) : null}
      </FormSection>
      </div>

      {message ? <StatusMessage {...message} /> : null}
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4 shadow-soft-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-sm text-ink-muted">
          <ImageIcon className="h-4 w-4 text-brand-700" aria-hidden="true" />
          <span>{workingProductId ? `WooCommerce product #${workingProductId}` : "Produk baru akan dibuat di WooCommerce"}</span>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/products" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-white px-4 text-sm font-medium text-ink hover:bg-slate-50">Batal</Link>
          <button disabled={busy} type="submit" className="inline-flex min-h-11 min-w-44 items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-wait disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
            {busy ? (glbFile ? "Menyimpan & upload…" : "Menyimpan…") : mode === "create" ? "Buat Produk" : "Simpan Perubahan"}
          </button>
        </div>
      </div>
    </form>
  );
}

const INPUT = "min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[15px] font-medium text-ink outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function initialForm(product?: AdminWooCommerceProductDetail, routeMoqDefaults?: MoqSettings): AdminWooProductInput {
  const attributes = product?.attributes ?? [];
  return {
    productKind: product ? product.productKind : "simple",
    modelCode: product?.modelCode || product?.sku || "",
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    sku: product?.sku ?? "",
    regularPrice: product?.price || 0,
    weightGram: product?.weightGram || 0,
    lengthCm: product?.lengthCm || 0,
    widthCm: product?.widthCm || 0,
    heightCm: product?.heightCm || 0,
    status: product?.status === "publish" ? "publish" : "draft",
    description: product?.description ?? "",
    shortDescription: product?.shortDescription ?? "",
    categoryIds: product?.categories.map((item) => item.id) ?? [],
    industries: (product?.industries ?? []).map(taxonomySlug),
    imageUrls: product?.imageUrls ?? [],
    colors: findAttribute(attributes, ["color", "warna"]),
    sizes: product ? findAttribute(attributes, ["size", "ukuran"]) : ["OS"],
    materials: findAttribute(attributes, ["material", "bahan"]),
    gender: product?.ofissioMeta.gender === "men" || product?.ofissioMeta.gender === "women" ? product.ofissioMeta.gender : "unisex",
    sleeveType: product?.ofissioMeta.sleeveType === "long" ? "long" : "short",
    safetyFeatures: product?.ofissioMeta.safetyFeatures ?? [],
    moq: product?.ofissioMeta.moq || routeMoqDefaults?.fulfillment || 20,
    leadTimeDays: Number(product?.ofissioMeta.leadTime.match(/\d+/)?.[0] ?? 14),
    fulfillmentType: normalizeFulfillment(product?.ofissioMeta.fulfillmentType),
    transactionMode: normalizeTransaction(product?.ofissioMeta.transactionMode),
    alwaysOrderable: product?.ofissioMeta.alwaysOrderable ?? true,
    replenishmentPolicy: product?.ofissioMeta.replenishmentPolicy === "block_order_future" ? "block_order_future" : "internal_warning_only",
    processRoute: WOO_PROCESS_ROUTES.includes(product?.ofissioMeta.processRoute as never) ? product!.ofissioMeta.processRoute as AdminWooProductInput["processRoute"] : "fulfillment",
    supportsEmbroidery: product?.ofissioMeta.supportsEmbroidery ?? true,
    supportsScreenPrinting: product?.ofissioMeta.supportsScreenPrinting ?? false,
    supportsDtf: product?.ofissioMeta.supportsDtf ?? false,
    embroideryZones: (product?.ofissioMeta.embroideryZones ?? []).map((zone) => ["back", "middle_back"].includes(zone) ? "center_back" : zone).filter((zone) => WOO_EMBROIDERY_ZONES.includes(zone as never)),
    quantityPricingEnabled: product?.ofissioMeta.quantityPricingEnabled ?? true,
    quantityPricingMode: "fixed_unit_price",
    quantityBasis: "total_order_qty",
    quantityPricingTiers: product?.ofissioMeta.quantityPricingTiers?.length
      ? product.ofissioMeta.quantityPricingTiers
      : [createDefaultQuantityPricingTier(product?.price || 0, product?.ofissioMeta.moq || routeMoqDefaults?.fulfillment || 20)],
    model3dExposure: product?.ofissioMeta.model3DExposure ?? 1.15,
    model3dEmissive: product?.ofissioMeta.model3DEmissive ?? 0.6,
    model3dBrightness: product?.ofissioMeta.model3DBrightness ?? 1,
    model3dSaturation: product?.ofissioMeta.model3DSaturation ?? 1,
    model3dHue: product?.ofissioMeta.model3DHue ?? 0,
    model3dTemperature: product?.ofissioMeta.model3DTemperature ?? 0,
    model3dRotationY: product?.ofissioMeta.model3DRotationY ?? defaultModelOrientationY(product?.sku),
  };
}

function formatTemperature(value: number) {
  if (Math.abs(value) < 0.001) return "Netral";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)} · ${value > 0 ? "hangat" : "dingin"}`;
}

function formatGlbUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function normalizeFulfillment(value?: string): AdminWooProductInput["fulfillmentType"] {
  const normalized = value?.toLowerCase().replace(/-/g, "_");
  return WOO_FULFILLMENT_TYPES.includes(normalized as never) ? normalized as AdminWooProductInput["fulfillmentType"] : "ready_stock_with_customization";
}

function normalizeTransaction(value?: string): AdminWooProductInput["transactionMode"] {
  const normalized = value?.toLowerCase().replace(/-/g, "_");
  if (normalized === "request_quotation") return "quotation";
  return WOO_TRANSACTION_MODES.includes(normalized as never) ? normalized as AdminWooProductInput["transactionMode"] : "hybrid";
}

function findAttribute(attributes: AdminWooCommerceProductDetail["attributes"], aliases: string[]) {
  return attributes.find((item) => aliases.includes(item.slug.toLowerCase()) || aliases.includes(item.name.toLowerCase()))?.options ?? [];
}

function attributeTerms(attributes: CatalogAttribute[], aliases: string[]) {
  return attributes.find((item) => aliases.includes(item.slug.toLowerCase()) || aliases.includes(item.name.toLowerCase()))?.terms.map((term) => term.name) ?? [];
}

function findCatalogAttribute(attributes: CatalogAttribute[], aliases: string[]) {
  return attributes.find((item) => aliases.includes(item.slug.toLowerCase()) || aliases.includes(item.name.toLowerCase()));
}

function lines(value: string) { return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean); }
function commaList(value: string) { return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean); }
function taxonomySlug(value: string) { return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

function FormSection({ icon: Icon, title, description, children }: { icon: typeof Box; title: string; description: string; children: ReactNode }) {
  return <section className="rounded-xl border border-line bg-white p-5 shadow-soft-sm sm:p-6"><div className="mb-5 flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700"><Icon className="h-5 w-5" aria-hidden="true" /></span><div><h2 className="text-base font-semibold text-ink">{title}</h2><p className="mt-1 text-sm leading-6 text-ink-muted">{description}</p></div></div>{children}</section>;
}

function Field({ label, hint, required, className = "", children }: { label: string; hint?: string; required?: boolean; className?: string; children: ReactNode }) {
  return <label className={`block ${className}`}><span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.06em] text-ink-subtle">{label}{required ? <span className="ml-1 text-red-600">*</span> : null}</span>{children}{hint ? <span className="mt-1.5 block text-xs leading-5 text-ink-muted">{hint}</span> : null}</label>;
}

// Varian Field dengan <div> (bukan <label>) — semantik yang benar untuk
// editor WYSIWYG: label tidak boleh membungkus contenteditable + toolbar.
function FieldBlock({ label, hint, required, className = "", children }: { label: string; hint?: string; required?: boolean; className?: string; children: ReactNode }) {
  return <div className={className}><span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.06em] text-ink-subtle">{label}{required ? <span className="ml-1 text-red-600">*</span> : null}</span>{children}{hint ? <span className="mt-1.5 block text-xs leading-5 text-ink-muted">{hint}</span> : null}</div>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <Field label={label} required><input className={INPUT} type="number" min={1} step={1} value={value} onChange={(event) => onChange(Number(event.target.value))} required /></Field>;
}

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  description,
  formatValue = (current) => current.toFixed(2),
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  description: string;
  formatValue?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-xs font-bold text-ink">
      <span className="flex items-center justify-between gap-3">
        <span>{label}</span>
        <span className="tabular-nums text-brand-700">{formatValue(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 h-6 w-full cursor-pointer accent-[#2563eb]"
      />
      <span className="mt-1 block font-normal leading-5 text-ink-muted">{description}</span>
    </label>
  );
}

function ShippingNumberField({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label} required>
      <div className="relative">
        <input
          className={`${INPUT} pr-16`}
          type="number"
          min="0.01"
          step="0.01"
          value={value || ""}
          placeholder="0"
          onChange={(event) => onChange(Number(event.target.value))}
          required
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-muted">
          {unit}
        </span>
      </div>
    </Field>
  );
}

function SelectField({ label, value, values, labels, onChange }: { label: string; value: string; values: readonly string[]; labels?: Record<string, string>; onChange: (value: string) => void }) {
  return <Field label={label} required><select className={INPUT} value={value} onChange={(event) => onChange(event.target.value)}>{values.map((item) => <option key={item} value={item}>{labels?.[item] ?? item.replace(/_/g, " ")}</option>)}</select></Field>;
}

function ListField({ label, value, onChange, suggestions }: { label: string; value: string[]; onChange: (value: string[]) => void; suggestions: string[] }) {
  const canonicalValue = value.join(", ");
  const [draft, setDraft] = useState(canonicalValue);

  useEffect(() => {
    // Keep unfinished separators (for example "Navy, ") visible while typing.
    // Only replace the draft when the actual list changed from outside this field.
    if (commaList(draft).join(", ") !== canonicalValue) {
      setDraft(canonicalValue);
    }
  }, [canonicalValue, draft]);

  return <Field label={label} hint={suggestions.length ? `Pilihan master: ${suggestions.join(", ")}. Anda juga dapat mengetik warna baru.` : "Pisahkan beberapa nilai dengan koma."}><input className={INPUT} value={draft} onChange={(event) => {
    const nextDraft = event.target.value;
    setDraft(nextDraft);
    onChange(commaList(nextDraft));
  }} placeholder="Contoh: Navy, Black, Kuning" /></Field>;
}

function MasterMultiSelectField({
  label,
  masterSlug,
  required = true,
  value,
  onChange,
  attribute,
}: {
  label: string;
  masterSlug: string;
  required?: boolean;
  value: string[];
  onChange: (value: string[]) => void;
  attribute?: CatalogAttribute;
}) {
  const [managedAttribute, setManagedAttribute] = useState(attribute);
  const [options, setOptions] = useState(() => attribute?.terms.map((term) => term.name) ?? []);
  const [newValue, setNewValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [creatingMaster, setCreatingMaster] = useState(false);
  const normalizedOptions = new Map(
    options.map((option) => [option.trim().toLocaleLowerCase("id-ID"), option]),
  );
  const available = options.filter(
    (option) => !value.some((selected) => selected.toLocaleLowerCase("id-ID") === option.toLocaleLowerCase("id-ID")),
  );
  const unmanaged = value.filter(
    (selected) => !normalizedOptions.has(selected.trim().toLocaleLowerCase("id-ID")),
  );

  async function addMasterValue() {
    const name = newValue.trim();
    if (!managedAttribute || name.length < 1) return;
    setAdding(true);
    setAddError(null);
    try {
      const response = await fetch(`/api/admin/catalog/attributes/${managedAttribute.id}/terms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...MOCK_INTERNAL_HEADERS,
        },
        body: JSON.stringify({ name }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        term?: { name?: string };
      };
      if (!response.ok || !result.ok || !result.term?.name) {
        throw new Error(result.message || `${label} baru belum dapat ditambahkan.`);
      }
      const savedName = result.term.name;
      setOptions((current) => uniqueCaseInsensitive([...current, savedName]));
      if (!value.some((item) => item.toLocaleLowerCase("id-ID") === savedName.toLocaleLowerCase("id-ID"))) {
        onChange([...value, savedName]);
      }
      setNewValue("");
    } catch (error) {
      setAddError(error instanceof Error ? error.message : `${label} baru belum dapat ditambahkan.`);
    } finally {
      setAdding(false);
    }
  }

  async function createMasterAttribute() {
    setCreatingMaster(true);
    setAddError(null);
    try {
      const response = await fetch("/api/admin/catalog/attributes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...MOCK_INTERNAL_HEADERS },
        body: JSON.stringify({
          name: label,
          slug: masterSlug,
          initialTerms: value,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        attribute?: CatalogAttribute;
      };
      if (!response.ok || !result.ok || !result.attribute) {
        throw new Error(result.message || `Master ${label.toLowerCase()} belum dapat dibuat.`);
      }
      setManagedAttribute(result.attribute);
      setOptions(result.attribute.terms.map((term) => term.name));
    } catch (error) {
      setAddError(error instanceof Error ? error.message : `Master ${label.toLowerCase()} belum dapat dibuat.`);
    } finally {
      setCreatingMaster(false);
    }
  }

  return (
    <Field
      label={label}
      required={required}
      hint={label === "Warna"
        ? "Satu kombinasi adalah satu varian. Gunakan satu nama, misalnya Kuning–Navy; jangan pilih Kuning dan Navy secara terpisah."
        : `Pilih dari master ${label.toLowerCase()} agar data konsisten di seluruh katalog.`}
    >
      <select
        className={INPUT}
        value=""
        onChange={(event) => {
          const selected = event.target.value;
          if (selected) onChange([...value, selected]);
        }}
        aria-label={`Tambah ${label.toLowerCase()}`}
      >
        <option value="">{available.length ? `+ Pilih ${label.toLowerCase()}` : `Semua ${label.toLowerCase()} master sudah dipilih`}</option>
        {available.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>

      {value.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2" aria-label={`${label} terpilih`}>
          {value.map((selected) => {
            const managed = normalizedOptions.has(selected.trim().toLocaleLowerCase("id-ID"));
            return (
              <span
                key={selected}
                className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${
                  managed
                    ? "border-brand-200 bg-brand-50 text-brand-800"
                    : "border-amber-300 bg-amber-50 text-amber-900"
                }`}
              >
                {label === "Warna" ? (
                  <span
                    className="h-5 w-5 shrink-0 rounded-full border border-black/10 ring-1 ring-white"
                    style={productColorSwatchStyle(selected)}
                    aria-hidden="true"
                  />
                ) : null}
                {label === "Warna" ? productColorDisplayLabel(selected) : selected}
                {!managed ? <span className="text-[10px] font-bold uppercase tracking-wide">Legacy</span> : null}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((item) => item !== selected))}
                  aria-label={`Hapus ${label.toLowerCase()} ${selected}`}
                  className="grid h-6 w-6 place-items-center rounded-full hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-600"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </span>
            );
          })}
        </div>
      ) : required ? (
        <p className="mt-2 text-xs font-semibold text-amber-700">Pilih minimal satu {label.toLowerCase()}.</p>
      ) : null}

      {unmanaged.length > 0 ? (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
          {unmanaged.join(", ")} belum terdaftar pada master {label.toLowerCase()}. Tambahkan melalui form di bawah atau hapus dari produk.
        </p>
      ) : null}
      <div className="mt-3 rounded-lg border border-line bg-slate-50 p-3">
        <p className="text-xs font-bold text-ink">{label} belum tersedia?</p>
        {managedAttribute ? (
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              className={INPUT}
              value={newValue}
              onChange={(event) => setNewValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void addMasterValue();
                }
              }}
              placeholder={label === "Warna" ? "Contoh: Kuning–Navy" : "Contoh: 4XL"}
              maxLength={100}
            />
            <button
              type="button"
              onClick={() => void addMasterValue()}
              disabled={adding || newValue.trim().length < 1}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
              Tambah {label}
            </button>
          </div>
        ) : (
          <div className="mt-2">
            <p className="text-xs leading-5 text-amber-800">
              Global attribute {label} belum tersedia. Ofissio dapat membuatnya sekaligus memindahkan pilihan Legacy di atas ke master.
            </p>
            <button
              type="button"
              onClick={() => void createMasterAttribute()}
              disabled={creatingMaster}
              className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creatingMaster ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
              Siapkan Master {label}
            </button>
          </div>
        )}
        {addError ? <p role="alert" className="mt-2 text-xs font-semibold text-red-700">{addError}</p> : null}
        <p className="mt-2 text-[11px] leading-5 text-ink-muted">Master disimpan ke WooCommerce melalui Ofissio dan langsung digunakan pada produk ini.</p>
      </div>
    </Field>
  );
}

function uniqueCaseInsensitive(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.trim().toLocaleLowerCase("id-ID");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function CheckboxGroup({ label, options, selected, onChange, required = false, disabled = false }: { label: string; options: Array<{ value: string; label: string }>; selected: string[]; onChange: (value: string[]) => void; required?: boolean; disabled?: boolean }) {
  const toggle = (value: string) => onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  return <fieldset disabled={disabled}><legend className="mb-2 text-xs font-bold uppercase tracking-[0.06em] text-ink-subtle">{label}{required ? <span className="ml-1 text-red-600">*</span> : null}</legend><div className="grid gap-2 sm:grid-cols-2">{options.map((option) => <label key={option.value} className={`flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium transition ${selected.includes(option.value) ? "border-brand-300 bg-brand-50 text-brand-800" : "border-line bg-white text-ink-muted"} ${disabled ? "opacity-50" : "cursor-pointer hover:border-brand-200"}`}><input type="checkbox" checked={selected.includes(option.value)} onChange={() => toggle(option.value)} className="h-4 w-4 accent-brand-700" />{option.label}</label>)}</div>{required && selected.length === 0 ? <p className="mt-2 text-xs font-medium text-amber-700">Pilih minimal satu.</p> : null}</fieldset>;
}

function Toggle({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className={`flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-lg border px-4 py-3 transition ${checked ? "border-brand-300 bg-brand-50" : "border-line bg-slate-50"}`}><span><span className="block text-sm font-semibold text-ink">{label}</span>{description ? <span className="mt-0.5 block text-xs leading-5 text-ink-muted">{description}</span> : null}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 shrink-0 accent-brand-700" /></label>;
}

function StatusMessage({ tone, text }: { tone: "success" | "warning" | "error"; text: string }) {
  const styles = tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-red-200 bg-red-50 text-red-900";
  return <div role={tone === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm font-medium leading-6 ${styles}`}>{text}</div>;
}
