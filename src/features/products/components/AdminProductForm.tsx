"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Box, CheckCircle2, FileBox, ImageIcon, Loader2, PackagePlus, Save, Settings2, Shirt } from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";

import type { CatalogAttribute, CatalogCategory, IndustryMaster } from "@/features/catalog-taxonomy/catalog-taxonomy.types";
import type { AdminWooCommerceProductDetail } from "@/features/products/woocommerce/woocommerce-product-admin.types";
import {
  WOO_EMBROIDERY_ZONES,
  WOO_FULFILLMENT_TYPES,
  WOO_PROCESS_ROUTES,
  WOO_PRODUCT_STATUSES,
  WOO_REPLENISHMENT_POLICIES,
  WOO_TRANSACTION_MODES,
  type AdminWooProductInput,
} from "@/features/products/woocommerce/woocommerce-product-management.types";

interface AdminProductFormProps {
  mode: "create" | "edit";
  product?: AdminWooCommerceProductDetail;
  options: {
    categories: CatalogCategory[];
    industries: IndustryMaster[];
    attributes: CatalogAttribute[];
  };
}

interface ApiProductResponse {
  ok?: boolean;
  message?: string;
  product?: AdminWooCommerceProductDetail;
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

export function AdminProductForm({ mode, product, options }: AdminProductFormProps) {
  const router = useRouter();
  const initial = useMemo(() => initialForm(product), [product]);
  const [form, setForm] = useState<AdminWooProductInput>(initial);
  const [glbFile, setGlbFile] = useState<File | null>(null);
  const [glbVersion, setGlbVersion] = useState(product?.ofissioMeta.model3DVersion || "v1");
  const [workingProductId, setWorkingProductId] = useState<number | null>(product?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "warning" | "error"; text: string } | null>(null);

  const set = <K extends keyof AdminWooProductInput>(key: K, value: AdminWooProductInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
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
          body: JSON.stringify(form),
        },
      );
      const payload = (await response.json().catch(() => null)) as ApiProductResponse | null;
      if (!response.ok || !payload?.product) {
        throw new Error(payload?.message || "Produk belum dapat disimpan.");
      }
      const saved = payload.product;
      setWorkingProductId(saved.id);

      if (glbFile) {
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
        const uploadPayload = (await uploadResponse.json().catch(() => null)) as ApiProductResponse | null;
        if (!uploadResponse.ok) {
          setMessage({
            tone: "warning",
            text: `Data produk sudah tersimpan, tetapi GLB gagal: ${uploadPayload?.message || "coba unggah ulang."}`,
          });
          return;
        }
        setGlbFile(null);
      }

      const refreshed = await fetch(`/api/admin/products/woocommerce/${saved.id}`, {
        cache: "no-store",
        headers: { Accept: "application/json", ...MOCK_INTERNAL_HEADERS },
      });
      const refreshedPayload = (await refreshed.json().catch(() => null)) as ApiProductResponse | null;
      const readiness = refreshedPayload?.product?.readiness ?? saved.readiness;
      if (readiness.isVisibleInOfissio) {
        setMessage({ tone: "success", text: "Produk tersimpan dan valid untuk tampil di Ofissio." });
      } else {
        setMessage({
          tone: "warning",
          text: `Produk tersimpan, tetapi belum tampil di Ofissio: ${readiness.blockingIssues.map((issue) => issue.label).join(", ")}.`,
        });
      }
      if (mode === "create") {
        router.replace(`/admin/products/woocommerce/${saved.id}?created=1`);
      } else {
        router.refresh();
      }
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Produk belum dapat disimpan." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {message ? <StatusMessage {...message} /> : null}

      <FormSection icon={PackagePlus} title="Informasi produk" description="Data utama yang akan ditulis langsung ke WooCommerce staging.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Nama produk" required>
            <input className={INPUT} value={form.name} onChange={(e) => set("name", e.target.value)} required maxLength={180} />
          </Field>
          <Field label="SKU" required hint="Wajib sebelum upload GLB; gunakan huruf, angka, titik, strip, atau underscore.">
            <input className={INPUT} value={form.sku} onChange={(e) => set("sku", e.target.value)} required pattern="[A-Za-z0-9._]+(-[A-Za-z0-9._]+)*" maxLength={100} />
          </Field>
          <Field label="Slug" hint="Opsional. Kosongkan agar WooCommerce membuat slug otomatis.">
            <input className={INPUT} value={form.slug ?? ""} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} maxLength={180} />
          </Field>
          <Field label="Harga reguler" required>
            <input className={INPUT} type="number" min={1} step={1} value={form.regularPrice} onChange={(e) => set("regularPrice", Number(e.target.value))} required />
          </Field>
          <Field label="Status WooCommerce" required>
            <select className={INPUT} value={form.status} onChange={(e) => set("status", e.target.value as AdminWooProductInput["status"])}>
              {WOO_PRODUCT_STATUSES.map((value) => <option key={value} value={value}>{value === "publish" ? "Publish" : "Draft"}</option>)}
            </select>
          </Field>
          <Field label="URL gambar produk" hint="Satu URL per baris. Upload media langsung belum diaktifkan pada Task A3.">
            <textarea className={`${INPUT} min-h-24`} value={form.imageUrls.join("\n")} onChange={(e) => set("imageUrls", lines(e.target.value))} placeholder="https://.../produk.jpg" />
          </Field>
          <Field label="Deskripsi singkat" className="lg:col-span-2">
            <textarea className={`${INPUT} min-h-24`} value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} maxLength={2000} />
          </Field>
          <Field label="Deskripsi lengkap" className="lg:col-span-2">
            <textarea className={`${INPUT} min-h-36`} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={20000} />
          </Field>
        </div>
      </FormSection>

      <FormSection icon={Settings2} title="Katalog dan atribut" description="Kategori dan industri menentukan filter katalog serta rekomendasi Ofistant.">
        <div className="grid gap-5 xl:grid-cols-2">
          <CheckboxGroup label="Kategori" required options={options.categories.filter((item) => item.active).map((item) => ({ value: String(item.id), label: item.name }))} selected={form.categoryIds.map(String)} onChange={(values) => set("categoryIds", values.map(Number))} />
          <CheckboxGroup label="Industri" required options={options.industries.filter((item) => item.active).map((item) => ({ value: item.slug, label: item.name }))} selected={form.industries} onChange={(values) => set("industries", values)} />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ListField label="Warna" value={form.colors} onChange={(value) => set("colors", value)} suggestions={attributeTerms(options.attributes, ["color", "warna"])} />
          <ListField label="Ukuran" value={form.sizes} onChange={(value) => set("sizes", value)} suggestions={attributeTerms(options.attributes, ["size", "ukuran"])} />
          <ListField label="Material" value={form.materials} onChange={(value) => set("materials", value)} suggestions={attributeTerms(options.attributes, ["material", "bahan"])} />
          <Field label="Gender">
            <select className={INPUT} value={form.gender} onChange={(e) => set("gender", e.target.value as AdminWooProductInput["gender"])}>
              <option value="unisex">Unisex</option><option value="men">Pria</option><option value="women">Wanita</option>
            </select>
          </Field>
          <Field label="Tipe lengan">
            <select className={INPUT} value={form.sleeveType} onChange={(e) => set("sleeveType", e.target.value as AdminWooProductInput["sleeveType"])}>
              <option value="short">Pendek</option><option value="long">Panjang</option>
            </select>
          </Field>
          <ListField label="Safety features" value={form.safetyFeatures} onChange={(value) => set("safetyFeatures", value)} suggestions={attributeTerms(options.attributes, ["safety-features", "safety"])} />
        </div>
      </FormSection>

      <FormSection icon={Box} title="Aturan B2B dan routing" description="Produk standar tetap dapat dipesan; kekurangan stok ditangani sebagai replenishment internal.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <NumberField label="MOQ" value={form.moq} onChange={(value) => set("moq", value)} />
          <NumberField label="Lead time (hari)" value={form.leadTimeDays} onChange={(value) => set("leadTimeDays", value)} />
          <SelectField label="Fulfillment type" value={form.fulfillmentType} values={WOO_FULFILLMENT_TYPES} onChange={(value) => set("fulfillmentType", value as AdminWooProductInput["fulfillmentType"])} />
          <SelectField label="Transaction mode" value={form.transactionMode} values={WOO_TRANSACTION_MODES} onChange={(value) => set("transactionMode", value as AdminWooProductInput["transactionMode"])} />
          <SelectField label="Process route" value={form.processRoute} values={WOO_PROCESS_ROUTES} onChange={(value) => set("processRoute", value as AdminWooProductInput["processRoute"])} />
          <SelectField label="Replenishment policy" value={form.replenishmentPolicy} values={WOO_REPLENISHMENT_POLICIES} onChange={(value) => set("replenishmentPolicy", value as AdminWooProductInput["replenishmentPolicy"])} />
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
      </FormSection>

      <div id="model-3d" className="scroll-mt-28">
      <FormSection icon={FileBox} title="Model 3D GLB" description="File disimpan privat di Supabase Storage. Viewer meminta signed URL baru saat diperlukan.">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
          <Field label={product?.ofissioMeta.model3DFilename ? "Ganti file GLB" : "Upload file GLB"} hint="Hanya .glb, maksimal sesuai MAX_GLB_UPLOAD_MB (default 100 MB).">
            <input className={`${INPUT} file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-xs file:font-bold file:text-brand-700`} type="file" accept=".glb,model/gltf-binary,application/octet-stream" onChange={(e) => setGlbFile(e.target.files?.[0] ?? null)} />
          </Field>
          <Field label="Versi model">
            <input className={INPUT} value={glbVersion} onChange={(e) => setGlbVersion(e.target.value.replace(/[^A-Za-z0-9._-]/g, ""))} required={Boolean(glbFile)} maxLength={40} />
          </Field>
        </div>
        {product?.ofissioMeta.model3DFilename ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span className="font-bold">GLB aktif:</span>
            <span>{product.ofissioMeta.model3DFilename} · {product.ofissioMeta.model3DVersion}</span>
          </div>
        ) : null}
      </FormSection>
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-white/80 bg-white/95 p-4 shadow-soft-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-sm text-ink-muted">
          <ImageIcon className="h-4 w-4 text-brand-700" aria-hidden="true" />
          <span>{workingProductId ? `WooCommerce product #${workingProductId}` : "Produk baru akan dibuat di WooCommerce"}</span>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/products" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-line bg-white px-4 text-sm font-bold text-ink hover:bg-slate-50">Batal</Link>
          <button disabled={busy} type="submit" className="inline-flex min-h-11 min-w-44 items-center justify-center gap-2 rounded-2xl bg-brand-700 px-5 text-sm font-black text-white shadow-lg shadow-brand-900/15 transition hover:bg-brand-800 disabled:cursor-wait disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
            {busy ? (glbFile ? "Menyimpan & upload…" : "Menyimpan…") : mode === "create" ? "Buat Produk" : "Simpan Perubahan"}
          </button>
        </div>
      </div>
    </form>
  );
}

const INPUT = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-ink outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100";

function initialForm(product?: AdminWooCommerceProductDetail): AdminWooProductInput {
  const attributes = product?.attributes ?? [];
  return {
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    sku: product?.sku ?? "",
    regularPrice: product?.price || 0,
    status: product?.status === "publish" ? "publish" : "draft",
    description: product?.description ?? "",
    shortDescription: product?.shortDescription ?? "",
    categoryIds: product?.categories.map((item) => item.id) ?? [],
    industries: (product?.industries ?? []).map(taxonomySlug),
    imageUrls: product?.imageUrls ?? [],
    colors: findAttribute(attributes, ["color", "warna"]),
    sizes: findAttribute(attributes, ["size", "ukuran"]),
    materials: findAttribute(attributes, ["material", "bahan"]),
    gender: product?.ofissioMeta.gender === "men" || product?.ofissioMeta.gender === "women" ? product.ofissioMeta.gender : "unisex",
    sleeveType: product?.ofissioMeta.sleeveType === "long" ? "long" : "short",
    safetyFeatures: product?.ofissioMeta.safetyFeatures ?? [],
    moq: product?.ofissioMeta.moq || 20,
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
  };
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

function lines(value: string) { return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean); }
function commaList(value: string) { return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean); }
function taxonomySlug(value: string) { return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

function FormSection({ icon: Icon, title, description, children }: { icon: typeof Box; title: string; description: string; children: ReactNode }) {
  return <section className="rounded-[1.75rem] border border-white/80 bg-white/95 p-5 shadow-soft-sm sm:p-6"><div className="mb-5 flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700"><Icon className="h-5 w-5" aria-hidden="true" /></span><div><h2 className="text-lg font-black text-ink">{title}</h2><p className="mt-1 text-sm leading-6 text-ink-muted">{description}</p></div></div>{children}</section>;
}

function Field({ label, hint, required, className = "", children }: { label: string; hint?: string; required?: boolean; className?: string; children: ReactNode }) {
  return <label className={`block ${className}`}><span className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-ink-subtle">{label}{required ? <span className="ml-1 text-red-600">*</span> : null}</span>{children}{hint ? <span className="mt-1.5 block text-xs leading-5 text-ink-muted">{hint}</span> : null}</label>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <Field label={label} required><input className={INPUT} type="number" min={1} step={1} value={value} onChange={(event) => onChange(Number(event.target.value))} required /></Field>;
}

function SelectField({ label, value, values, onChange }: { label: string; value: string; values: readonly string[]; onChange: (value: string) => void }) {
  return <Field label={label} required><select className={INPUT} value={value} onChange={(event) => onChange(event.target.value)}>{values.map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}</select></Field>;
}

function ListField({ label, value, onChange, suggestions }: { label: string; value: string[]; onChange: (value: string[]) => void; suggestions: string[] }) {
  return <Field label={label} hint={suggestions.length ? `Pilihan master: ${suggestions.join(", ")}` : "Pisahkan beberapa nilai dengan koma."}><input className={INPUT} value={value.join(", ")} onChange={(event) => onChange(commaList(event.target.value))} /></Field>;
}

function CheckboxGroup({ label, options, selected, onChange, required = false, disabled = false }: { label: string; options: Array<{ value: string; label: string }>; selected: string[]; onChange: (value: string[]) => void; required?: boolean; disabled?: boolean }) {
  const toggle = (value: string) => onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  return <fieldset disabled={disabled}><legend className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-ink-subtle">{label}{required ? <span className="ml-1 text-red-600">*</span> : null}</legend><div className="grid gap-2 sm:grid-cols-2">{options.map((option) => <label key={option.value} className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2 text-sm font-semibold transition ${selected.includes(option.value) ? "border-brand-300 bg-brand-50 text-brand-800" : "border-slate-200 bg-white text-ink-muted"} ${disabled ? "opacity-50" : "cursor-pointer hover:border-brand-200"}`}><input type="checkbox" checked={selected.includes(option.value)} onChange={() => toggle(option.value)} className="h-4 w-4 accent-brand-700" />{option.label}</label>)}</div>{required && selected.length === 0 ? <p className="mt-2 text-xs font-semibold text-amber-700">Pilih minimal satu.</p> : null}</fieldset>;
}

function Toggle({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className={`flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-2xl border px-4 py-3 transition ${checked ? "border-brand-300 bg-brand-50" : "border-slate-200 bg-slate-50"}`}><span><span className="block text-sm font-black text-ink">{label}</span>{description ? <span className="mt-0.5 block text-xs leading-5 text-ink-muted">{description}</span> : null}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 shrink-0 accent-brand-700" /></label>;
}

function StatusMessage({ tone, text }: { tone: "success" | "warning" | "error"; text: string }) {
  const styles = tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-red-200 bg-red-50 text-red-900";
  return <div role={tone === "error" ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 text-sm font-semibold leading-6 ${styles}`}>{text}</div>;
}
