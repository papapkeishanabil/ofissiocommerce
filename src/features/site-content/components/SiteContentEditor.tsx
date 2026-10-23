// src/features/site-content/components/SiteContentEditor.tsx
//
// Generic admin form editor for one homepage section. Mirrors
// EmbroideryPricingManager: useState seeded from initialState, useTransition
// save, fetch PATCH with the internal dev headers, success/error banner,
// router.refresh() so this admin view reflects the saved row. The public "/"
// refreshes via revalidateTag("site-content") fired in the PATCH route.
//
// The body is a recursive renderer over the section's FieldDescriptor tree:
//   text    -> Input
//   textarea-> Textarea
//   icon    -> Select of the icon allowlist + a live preview chip
//   list    -> repeating cards (one per item) with reorder/hide/remove,
//              optionally collapsible via the descriptor (long lists)
//
// Phase 1 sections are flat { items: [...] } shapes, but the renderer already
// recurses through itemFields so Phase 2/3 field types slot in without
// touching this scaffolding.

"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  Cuboid,
  ImagePlus,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  ShieldAlert,
  Trash2,
  Video as VideoIcon,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { AdminPanel } from "@/features/admin/components/AdminSurface";
import { optimizeProductImage } from "@/features/products/components/product-image-optimization.client";
import {
  HOMEPAGE_ICON_KEYS,
  resolveHomepageIcon,
} from "@/features/site-content/icon-registry";
import { getSectionEntry } from "@/features/site-content/content.schema";
import type { FieldDescriptor, SectionKey, IndustryInspirationData } from "@/features/site-content/content.schema";
import { upsertInspirationDraft } from "@/features/site-content/industry-inspiration.draft";
import { IndustryInspirationEditor } from "@/features/site-content/components/IndustryInspirationEditor";
import { IndustryInspirationPagesEditor } from "@/features/site-content/components/IndustryInspirationPagesEditor";
import { cn } from "@/lib/utils";
import { INSPIRATION_PAGES } from "@/features/site-content/industry-inspiration.routes";
import { InspirationPhotoFrameEditor } from "./InspirationPhotoFrameEditor";
import type { IndustriSectionData } from "../content.schema";
import { DEFAULT_INDUSTRI } from "@/features/site-content/content.schema";

export interface SiteContentEditorState {
  data: unknown;
  source: "supabase" | "mock" | "fallback";
  schemaReady: boolean;
}

function cloneRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  }
  return {};
}

/** A sensible blank value for one field kind — so a freshly added item has the
 *  right SHAPE (the editor renders it; zod still catches empty required fields
 *  on save). icon -> Sparkles, text/textarea -> "", enum -> first option,
 *  segments -> one empty fragment, list/stringList -> [], boolean -> false,
 *  discriminated -> first variant seeded with blanks for that variant. */
function blankFromDescriptor(f: FieldDescriptor): unknown {
  switch (f.kind) {
    case "text":
    case "textarea":
    case "image":
    case "model3d":
    case "video":
      return "";
    case "icon":
      return "Sparkles";
    case "boolean":
      return false;
    case "enum":
      return f.options[0]?.value ?? "";
    case "segments":
      return [{ text: "" }];
    case "stringList":
      return [];
    case "list":
      return [];
    case "discriminated":
      return blankDiscriminated(f.discriminator, f.variants, Object.keys(f.variants)[0] ?? "");
    case "industryInspiration":
      return {};
  }
}

/** Build a blank object for one discriminator value: the discriminator key set,
 *  plus a blank for each of that variant's sub-descriptors. Switching the
 *  discriminator in the editor replaces the whole object with a fresh blank of
 *  the new variant (no stale fields from the old one leak through). */
function blankDiscriminated(
  discriminator: string,
  variants: { [value: string]: FieldDescriptor[] },
  activeKey: string,
): Record<string, unknown> {
  const item: Record<string, unknown> = { [discriminator]: activeKey };
  for (const f of variants[activeKey] ?? []) item[f.key] = blankFromDescriptor(f);
  return item;
}

/** Build a fresh blank item from its field descriptors. */
function blankItem(itemFields: FieldDescriptor[]): Record<string, unknown> {
  const item: Record<string, unknown> = {};
  for (const f of itemFields) item[f.key] = blankFromDescriptor(f);
  return item;
}

function itemCount(data: unknown): number | null {
  const items = (data as { items?: unknown[] } | null)?.items;
  return Array.isArray(items) ? items.length : null;
}

/** Rangkai issue validasi menjadi nama kolom yang dikenal admin, mis.
 *  "Kartu Ulasan — ulasan #1: Tanggal". API menolak payload invalid dengan
 *  pesan generik (kebijakan safe-error untuk permukaan publik), jadi editor
 *  memvalidasi lokal dengan skema yang sama persis sebelum mengirim — admin
 *  langsung tahu kolom mana yang harus dilengkapi. */
function describeValidationIssues(
  issues: readonly { path: readonly PropertyKey[] }[],
  fields: readonly FieldDescriptor[],
): string {
  const parts = issues.slice(0, 4).map((issue) => {
    const [root, index, leaf] = issue.path;
    if (typeof root === "string" && typeof index === "number" && typeof leaf === "string") {
      const list = fields.find(
        (field): field is Extract<FieldDescriptor, { kind: "list" }> =>
          field.kind === "list" && field.key === root,
      );
      const leafField = list?.itemFields?.find((field) => field.key === leaf);
      if (list && leafField) {
        return `${list.label} — ${list.itemLabel ?? "item"} #${index + 1}: ${leafField.label}`;
      }
    }
    const rootField = fields.find((field) => field.key === root);
    return rootField ? rootField.label : issue.path.join(".") || "data";
  });
  return `Data belum valid. Periksa: ${parts.join("; ")}.`;
}

export function SiteContentEditor({
  section,
  label,
  description,
  fields,
  initialState,
  defaultValue,
  canUpdate,
}: {
  section: SectionKey;
  label: string;
  description: string;
  fields: FieldDescriptor[];
  initialState: SiteContentEditorState;
  defaultValue: unknown;
  canUpdate: boolean;
}) {
  const router = useRouter();
  const [data, setData] = useState<Record<string, unknown>>(() =>
    cloneRecord(initialState.data),
  );
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const disabled = !canUpdate || isPending;

  function save() {
    setMessage(null);
    // Validasi lokal dulu dengan skema section yang sama persis — pesan
    // kegagalan API sengaja generik, di sini kita bisa menyebut kolomnya.
    const entry = getSectionEntry(section);
    const parsed = entry ? entry.schema.safeParse(data) : null;
    if (parsed && !parsed.success) {
      setMessage({
        kind: "err",
        text: describeValidationIssues(parsed.error.issues, fields),
      });
      return;
    }
    startTransition(async () => {
      const response = await fetch("/api/admin/site-content", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-ofissio-internal-role": "product_admin",
          "x-ofissio-internal-user-id": "product-admin-dev",
        },
        body: JSON.stringify({ section, data }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || !result.ok) {
        setMessage({
          kind: "err",
          text: result.message ?? "Konten belum dapat disimpan. Periksa kembali isian.",
        });
        return;
      }
      setMessage({
        kind: "ok",
        text: "Konten tersimpan. Halaman publik memuat perubahan pada request berikutnya.",
      });
      router.refresh();
    });
  }

  function resetToDefault() {
    setMessage(null);
    setData(cloneRecord(defaultValue));
  }

  const count = itemCount(data);

  return (
    <AdminPanel
      title={label}
      description={description}
      actions={
        <span
          className={cn(
            "inline-flex min-h-8 items-center gap-2 rounded-full px-3 text-xs font-black uppercase tracking-[0.14em]",
            initialState.schemaReady
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-800",
          )}
        >
          {initialState.schemaReady ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <ShieldAlert className="h-4 w-4" />
          )}
          {initialState.source}
        </span>
      }
    >
      {!initialState.schemaReady ? (
        <div
          role="alert"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900"
        >
          Migration 025 (tabel <span className="font-mono">site_content</span>) belum aktif.
          Nilai bawaan ditampilkan sebagai fallback; penyimpanan Supabase belum tersedia sampai
          migrasi dijalankan.
        </div>
      ) : null}
      {!canUpdate ? (
        <div
          role="note"
          className="rounded-2xl border border-line bg-slate-50 p-4 text-sm font-semibold leading-6 text-ink-muted"
        >
          Role Anda memiliki akses baca. Perubahan konten hanya tersedia untuk super admin dan
          product admin.
        </div>
      ) : null}

      <fieldset disabled={disabled} className="mt-5 space-y-5">
        {section === "industri" && <section className="space-y-4 rounded-xl border border-line bg-white p-5">
          <h2 className="text-lg font-bold">Foto besar Bisnis Naik Kelas</h2>
          <p className="text-sm text-ink-muted">Unggah foto khusus untuk kolom besar. Foto dan posisinya tersimpan terpisah dari kartu industri di sebelahnya.</p>
          <BusinessFeatureFields value={data.businessFeature as IndustriSectionData["businessFeature"]} onChange={(next) => setData((current) => ({ ...current, businessFeature: next }))} />
        </section>}
        {fields.map((field) => field.kind === "industryInspiration" ? (
          <IndustryInspirationPagesEditor
            key={field.key}
            label={field.label}
            help={field.help}
            legacy={data[field.key]}
            value={data.inspirationPages}
            onChange={(next) => setData((current) => ({
              ...current,
              inspirationPages: upsertInspirationDraft(
                Array.isArray(current.inspirationPages) ? current.inspirationPages as IndustryInspirationData[] : [],
                next,
              ),
            }))}
          />
        ) : (
          <FieldRenderer
            key={field.key}
            field={field}
            value={data[field.key]}
            onChange={(next) => setData((d) => ({ ...d, [field.key]: next }))}
          />
        ))}
      </fieldset>

      {canUpdate ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-ink-muted">
            {count !== null ? `${count} item dalam sesi ini` : ""}
          </span>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={resetToDefault} disabled={isPending}>
              <RotateCcw className="h-4 w-4" />
              Kembalikan ke bawaan
            </Button>
            <Button type="button" onClick={save} disabled={isPending}>
              <Save className="h-4 w-4" />
              {isPending ? "Menyimpan..." : "Simpan perubahan"}
            </Button>
          </div>
        </div>
      ) : null}

      {message ? (
        <p
          role="status"
          aria-live="polite"
          className={cn(
            "mt-5 rounded-xl px-4 py-3 text-sm font-bold",
            message.kind === "ok" ? "bg-brand-50 text-brand-800" : "bg-red-50 text-red-700",
          )}
        >
          {message.text}
        </p>
      ) : null}
    </AdminPanel>
  );
}

// ---------------------------------------------------------------------------
// Recursive field renderer
// ---------------------------------------------------------------------------

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: FieldDescriptor;
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  const id = useId();

  if (field.kind === "industryInspiration") {
    return (
      <IndustryInspirationEditor
        label={field.label}
        help={field.help}
        value={value}
        onChange={onChange}
      />
    );
  }

  if (field.kind === "text") {
    return (
      <Field label={field.label} htmlFor={id} hint={field.help}>
        <Input
          id={id}
          suppressHydrationWarning
          value={String(value ?? "")}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          onChange={(event) => onChange(event.target.value)}
        />
        {field.maxLength ? (
          <CharacterCount value={String(value ?? "")} max={field.maxLength} />
        ) : null}
      </Field>
    );
  }

  if (field.kind === "textarea") {
    return (
      <Field label={field.label} htmlFor={id} hint={field.help}>
        <Textarea
          id={id}
          suppressHydrationWarning
          rows={field.rows ?? 3}
          value={String(value ?? "")}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          onChange={(event) => onChange(event.target.value)}
        />
        {field.maxLength ? (
          <CharacterCount value={String(value ?? "")} max={field.maxLength} />
        ) : null}
      </Field>
    );
  }

  if (field.kind === "icon") {
    const Icon = resolveHomepageIcon(String(value ?? ""));
    return (
      <Field label={field.label} htmlFor={id} hint={field.help}>
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line bg-slate-50 text-brand-700"
          >
            <Icon className="h-5 w-5" />
          </span>
          <Select
            id={id}
            value={String(value ?? "")}
            onChange={(event) => onChange(event.target.value)}
          >
            {HOMEPAGE_ICON_KEYS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </Select>
        </div>
      </Field>
    );
  }

  if (field.kind === "boolean") {
    return (
      <Field label={field.label} htmlFor={id} hint={field.help}>
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg border border-line bg-white px-3.5 text-sm font-semibold text-ink transition hover:bg-slate-50">
          <input
            id={id}
            suppressHydrationWarning
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onChange(event.target.checked)}
            className="h-4 w-4 accent-brand-700"
          />
          {field.toggleLabel ?? "Aktif"}
        </label>
      </Field>
    );
  }

  if (field.kind === "enum") {
    return (
      <Field label={field.label} htmlFor={id} hint={field.help}>
        <Select id={id} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)}>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
    );
  }

  if (field.kind === "stringList") {
    const lines = Array.isArray(value) ? (value as unknown[]).map((l) => String(l ?? "")) : [];
    return (
      <Field label={field.label} hint={field.help}>
        <div className="space-y-2">
          {lines.map((line, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                suppressHydrationWarning
                value={line}
                maxLength={field.maxLength}
                placeholder={field.itemLabel ? `${field.itemLabel}…` : "Teks…"}
                onChange={(event) =>
                  onChange(lines.map((s, i) => (i === index ? event.target.value : s)))
                }
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => onChange(lines.filter((_, i) => i !== index))}
                disabled={field.min ? lines.length <= field.min : false}
                className="inline-flex min-h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-red-600 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`Hapus ${field.itemLabel ?? "baris"}`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ))}
          {!field.max || lines.length < field.max ? (
            <button
              type="button"
              onClick={() => onChange([...lines, ""])}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-dashed border-line-strong bg-white px-3.5 py-2 text-sm font-semibold text-brand-700 transition hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Tambah {field.itemLabel ?? "baris"}
            </button>
          ) : null}
        </div>
      </Field>
    );
  }

  if (field.kind === "discriminated") {
    const obj =
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
    return (
      <Field label={field.label} hint={field.help}>
        <div className="space-y-3 rounded-xl border border-line bg-slate-50/60 p-4">
          <DiscriminatedFields
            discriminator={field.discriminator}
            variants={field.variants}
            value={obj}
            onChange={onChange}
          />
        </div>
      </Field>
    );
  }

  if (field.kind === "segments") {
    const segs = Array.isArray(value)
      ? (value as { text?: string; highlight?: boolean }[])
      : [];
    return (
      <Field
        label={field.label}
        hint={field.help ?? "Bagian berwarna akan ditebalkan dengan warna aksen pada halaman publik."}
      >
        <div className="space-y-2">
          {segs.map((seg, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                suppressHydrationWarning
                value={String(seg?.text ?? "")}
                maxLength={140}
                placeholder="Teks potongan…"
                onChange={(event) =>
                  onChange(
                    segs.map((s, i) =>
                      i === index ? { ...s, text: event.target.value } : s,
                    ),
                  )
                }
                className="flex-1"
              />
              <label className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-ink">
                <input
                  suppressHydrationWarning
                  type="checkbox"
                  checked={Boolean(seg?.highlight)}
                  onChange={(event) =>
                    onChange(
                      segs.map((s, i) =>
                        i === index ? { ...s, highlight: event.target.checked } : s,
                      ),
                    )
                  }
                  className="h-4 w-4 accent-brand-700"
                />
                Tekan
              </label>
              <button
                type="button"
                onClick={() => onChange(segs.filter((_, i) => i !== index))}
                disabled={segs.length <= 1}
                className="inline-flex min-h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-red-600 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Hapus potongan teks"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ))}
          {!field.max || segs.length < field.max ? (
            <button
              type="button"
              onClick={() => onChange([...segs, { text: "" }])}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-dashed border-line-strong bg-white px-3.5 py-2 text-sm font-semibold text-brand-700 transition hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Tambah potongan teks
            </button>
          ) : null}
        </div>
      </Field>
    );
  }

  if (field.kind === "image") {
    return (
      <ImageFieldControl
        id={id}
        label={field.label}
        help={field.help}
        placeholder={field.placeholder}
        maxLength={field.maxLength}
        value={String(value ?? "")}
        onChange={onChange}
      />
    );
  }

  if (field.kind === "model3d") {
    return (
      <Model3DFieldControl
        id={id}
        label={field.label}
        help={field.help}
        placeholder={field.placeholder}
        maxLength={field.maxLength}
        target={field.target}
        value={String(value ?? "")}
        onChange={onChange}
      />
    );
  }

  if (field.kind === "video") {
    return (
      <VideoFieldControl
        id={id}
        label={field.label}
        scope={field.scope}
        help={field.help}
        placeholder={field.placeholder}
        maxLength={field.maxLength}
        value={String(value ?? "")}
        onChange={onChange}
      />
    );
  }

  // list
  if (field.kind === "list") {
    return <ListField field={field} value={value} onChange={onChange} />;
  }

  return null;
}

/** Repeating list editor: one bordered card per item with reorder (naik/turun),
 *  hapus, and tambah. When the descriptor sets `collapsible`, each card's
 *  fields hide behind a header toggle (default closed) headed by the
 *  `titleKey` value — built for long lists like §02 groups/tiles. */
function ListField({
  field,
  value,
  onChange,
}: {
  field: Extract<FieldDescriptor, { kind: "list" }>;
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
  const useDiscriminated = Boolean(field.itemDiscriminator && field.itemVariants);
  const collapsible = field.collapsible === true;
  // Open state is tracked per index (sparse array of booleans) and travels
  // with the item when reordered. Non-collapsible lists render everything.
  const [openItems, setOpenItems] = useState<(boolean | undefined)[]>([]);
  const isOpen = (index: number) => (collapsible ? openItems[index] === true : true);
  const setOpen = (index: number, open: boolean) =>
    setOpenItems((prev) => {
      const next = [...prev];
      next[index] = open;
      return next;
    });

  const blankRow = () =>
    useDiscriminated && field.itemDiscriminator && field.itemVariants
      ? blankDiscriminated(field.itemDiscriminator, field.itemVariants, Object.keys(field.itemVariants)[0] ?? "")
      : blankItem(field.itemFields ?? []);

  function moveItem(from: number, to: number) {
    if (to < 0 || to >= items.length) return;
    const nextItems = [...items];
    const [moved] = nextItems.splice(from, 1);
    if (!moved) return;
    nextItems.splice(to, 0, moved);
    setOpenItems((prev) => {
      const states = [...prev];
      const [state] = states.splice(from, 1);
      states.splice(to, 0, state);
      return states;
    });
    onChange(nextItems);
  }

  function addItem() {
    onChange([...items, blankRow()]);
    if (collapsible) setOpen(items.length, true);
  }

  return (
    <Field label={field.label} hint={field.help}>
      <div className="space-y-3">
        {items.map((item, index) => {
          const obj =
            item && typeof item === "object" && !Array.isArray(item)
              ? item
              : {};
          const title =
            String(obj[field.titleKey ?? ""] ?? "").trim() ||
            `${field.itemLabel} #${index + 1}`;
          return (
            <div
              key={index}
              className="rounded-xl border border-line bg-slate-50/60 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                {collapsible ? (
                  <button
                    type="button"
                    onClick={() => setOpen(index, !isOpen(index))}
                    aria-expanded={isOpen(index)}
                    className="flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 text-left text-sm font-bold text-ink-strong transition hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-ink-muted transition-transform duration-200",
                        isOpen(index) && "rotate-180",
                      )}
                      aria-hidden
                    />
                    <span className="truncate">{title}</span>
                    {obj.hidden === true ? (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-800">
                        Disembunyikan
                      </span>
                    ) : null}
                  </button>
                ) : (
                  <span className="text-xs font-bold uppercase tracking-[0.08em] text-ink-muted">
                    {field.itemLabel} #{index + 1}
                  </span>
                )}
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => moveItem(index, index - 1)}
                    disabled={index === 0}
                    className="inline-flex min-h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-ink-muted transition hover:bg-slate-50 hover:text-ink-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Naikkan ${field.itemLabel} ke atas`}
                  >
                    <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(index, index + 1)}
                    disabled={index === items.length - 1}
                    className="inline-flex min-h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-ink-muted transition hover:bg-slate-50 hover:text-ink-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Turunkan ${field.itemLabel} ke bawah`}
                  >
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(items.filter((_, i) => i !== index))}
                    disabled={field.min ? items.length <= field.min : false}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Hapus
                  </button>
                </div>
              </div>
              {isOpen(index) ? (
                <div className="mt-3 space-y-3">
                  {useDiscriminated && field.itemDiscriminator && field.itemVariants ? (
                    <DiscriminatedFields
                      discriminator={field.itemDiscriminator}
                      variants={field.itemVariants}
                      value={obj}
                      onChange={(next) =>
                        onChange(items.map((it, i) => (i === index ? next : it)))
                      }
                    />
                  ) : (
                    (field.itemFields ?? []).map((f) => (
                      <FieldRenderer
                        key={f.key}
                        field={f}
                        value={obj[f.key]}
                        onChange={(v) =>
                          onChange(
                            items.map((it, i) =>
                              i === index ? { ...obj, [f.key]: v } : it,
                            ),
                          )
                        }
                      />
                    ))
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
        {!field.max || items.length < field.max ? (
          field.key === "tiles" ? <label className="block text-sm font-semibold text-ink">
            Tambahkan industri yang belum ada
            <Select className="mt-2" value="" onChange={(event) => {
              const page = INSPIRATION_PAGES.find((item) => item.industry === event.target.value);
              if (!page) return;
              const existing = items.some((item) => item && typeof item === "object" && !Array.isArray(item) && item.industry === page.industry);
              if (existing) return;
              const preset = DEFAULT_INDUSTRI.groups.flatMap((group) => group.tiles).find((tile) => tile.industry === page.industry);
              onChange([...items, { label: page.label, industry: page.industry, icon: preset?.icon ?? "Building2", photo: preset?.photo ?? "", caption: "", hidden: false }]);
              if (collapsible) setOpen(items.length, true);
            }}>
              <option value="">Pilih industri untuk ditambahkan</option>
              {INSPIRATION_PAGES.filter((page) => !items.some((item) => item && typeof item === "object" && !Array.isArray(item) && item.industry === page.industry)).map((page) => <option key={page.industry} value={page.industry}>{page.label}</option>)}
            </Select>
          </label> :
          <button
            type="button"
            onClick={addItem}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-dashed border-line-strong bg-white px-3.5 py-2 text-sm font-semibold text-brand-700 transition hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Tambah {field.itemLabel}
          </button>
        ) : null}
      </div>
    </Field>
  );
}

/** Renders a discriminated object: a Select for the discriminator key, then the
 *  active variant's sub-descriptors. Switching the Select replaces the whole
 *  object with a fresh blank of the new variant. Shared by the top-level
 *  `discriminated` field (e.g. hero panel) and `list` rows whose items are
 *  discriminated (e.g. hero CTAs). */
function DiscriminatedFields({
  discriminator,
  variants,
  value,
  onChange,
}: {
  discriminator: string;
  variants: { [value: string]: FieldDescriptor[] };
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const variantKeys = Object.keys(variants);
  const activeKey = String(value[discriminator] ?? variantKeys[0] ?? "");
  const subFields = variants[activeKey] ?? [];
  return (
    <>
      <Select
        value={activeKey}
        onChange={(event) =>
          onChange(blankDiscriminated(discriminator, variants, event.target.value))
        }
      >
        {variantKeys.map((k) => (
          <option key={k} value={k}>
            {k.charAt(0).toUpperCase() + k.slice(1)}
          </option>
        ))}
      </Select>
      <div className="space-y-3">
        {subFields.map((f) => (
          <FieldRenderer
            key={f.key}
            field={f}
            value={value[f.key]}
            onChange={(v) => onChange({ ...value, [discriminator]: activeKey, [f.key]: v })}
          />
        ))}
      </div>
    </>
  );
}

function CharacterCount({ value, max }: { value: string; max: number }) {
  return (
    <p className="text-[11px] tabular-nums text-ink-muted">
      {value.length}/{max}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Image field — upload ke WordPress Media (route admin site-content) dengan
// pratinjau. Nilai tetap string biasa: hasil upload mengisi URL, atau ketik
// path manual (cth: aset lokal /industries/…). String kosong = tanpa foto.
// ---------------------------------------------------------------------------

const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp";
const MODEL_3D_ACCEPT = ".glb,model/gltf-binary,application/octet-stream";
const VIDEO_ACCEPT = ".mp4,.webm,video/mp4,video/webm";

function VideoFieldControl({
  id,
  label,
  scope,
  help,
  placeholder,
  maxLength,
  value,
  onChange,
}: {
  id: string;
  label: string;
  scope: "hero" | "bordir";
  help?: string;
  placeholder?: string;
  maxLength?: number;
  value: string;
  onChange: (next: unknown) => void;
}) {
  const fileId = `${id}-video-file`;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    setUploadedFilename(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("scope", scope);
      const response = await fetch("/api/admin/site-content/video", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "x-ofissio-internal-role": "product_admin",
          "x-ofissio-internal-user-id": "product-admin-dev",
        },
        body: formData,
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        url?: string;
        filename?: string;
        message?: string;
      };
      if (!response.ok || !result.ok || !result.url) {
        setError(result.message ?? "Video gagal diunggah.");
        return;
      }
      onChange(result.url);
      setUploadedFilename(result.filename ?? file.name);
    } catch {
      setError("Video gagal diunggah. Periksa koneksi lalu coba lagi.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <Field label={label} htmlFor={id} hint={help}>
      <div className="space-y-3">
        <div className="overflow-hidden rounded-xl border border-line bg-slate-950">
          {value ? (
            <video
              key={value}
              src={value}
              controls
              muted
              playsInline
              preload="metadata"
              className="aspect-video max-h-72 w-full object-contain"
            >
              Browser tidak mendukung pratinjau video.
            </video>
          ) : (
            <div className="grid aspect-video max-h-52 place-items-center text-white/70">
              <span className="flex items-center gap-2 text-sm font-bold">
                <VideoIcon className="h-5 w-5" aria-hidden />
                Belum ada video
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            aria-busy={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <VideoIcon className="h-4 w-4" aria-hidden />
            )}
            {uploading ? "Mengunggah video..." : value ? "Ganti video" : "Unggah video"}
          </Button>
          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploading}
              onClick={() => {
                onChange("");
                setUploadedFilename(null);
                setError(null);
              }}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Gunakan video bawaan
            </Button>
          ) : null}
          <input
            ref={fileInputRef}
            id={fileId}
            type="file"
            accept={VIDEO_ACCEPT}
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
        </div>
        <Input
          id={id}
          suppressHydrationWarning
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          onChange={(event) => {
            onChange(event.target.value);
            setUploadedFilename(null);
          }}
        />
        {maxLength ? <CharacterCount value={value} max={maxLength} /> : null}
        {uploadedFilename ? (
          <p role="status" className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            {uploadedFilename} berhasil diunggah. Simpan section untuk menerbitkannya.
          </p>
        ) : value ? (
          <p className="text-xs font-semibold text-ink-muted">Video terhubung dan siap dipratinjau.</p>
        ) : (
          <p className="text-xs font-semibold text-ink-muted">Video bawaan akan digunakan.</p>
        )}
        {error ? <p role="alert" className="text-xs font-bold text-red-600">{error}</p> : null}
      </div>
    </Field>
  );
}

function Model3DFieldControl({
  id,
  label,
  help,
  placeholder,
  maxLength,
  target,
  value,
  onChange,
}: {
  id: string;
  label: string;
  help?: string;
  placeholder?: string;
  maxLength?: number;
  target?: string;
  value: string;
  onChange: (next: unknown) => void;
}) {
  const fileId = `${id}-glb-file`;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    setUploadedFilename(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (target) formData.append("target", target);
      const response = await fetch("/api/admin/site-content/model-3d", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "x-ofissio-internal-role": "product_admin",
          "x-ofissio-internal-user-id": "product-admin-dev",
        },
        body: formData,
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        url?: string;
        filename?: string;
        message?: string;
      };
      if (!response.ok || !result.ok || !result.url) {
        setError(result.message ?? "Model 3D gagal diunggah.");
        return;
      }
      onChange(result.url);
      setUploadedFilename(result.filename ?? file.name);
    } catch {
      setError("Model 3D gagal diunggah. Periksa koneksi lalu coba lagi.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <Field label={label} htmlFor={id} hint={help}>
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <div className="grid h-20 w-16 shrink-0 place-items-center rounded-lg border border-line bg-brand-50 text-brand-700">
            <Cuboid className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                aria-busy={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Cuboid className="h-4 w-4" aria-hidden />
                )}
                {uploading ? "Mengunggah model..." : value ? "Ganti model 3D" : "Unggah model 3D"}
              </Button>
              {value ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={uploading}
                  onClick={() => {
                    onChange("");
                    setUploadedFilename(null);
                    setError(null);
                  }}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Hapus model
                </Button>
              ) : null}
              <input
                ref={fileInputRef}
                id={fileId}
                type="file"
                accept={MODEL_3D_ACCEPT}
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void upload(file);
                }}
              />
            </div>
            <Input
              id={id}
              suppressHydrationWarning
              value={value}
              placeholder={placeholder ?? "/3d/model.glb"}
              maxLength={maxLength}
              onChange={(event) => {
                onChange(event.target.value);
                setUploadedFilename(null);
              }}
            />
            {maxLength ? <CharacterCount value={value} max={maxLength} /> : null}
          </div>
        </div>
        {uploadedFilename ? (
          <p role="status" className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            {uploadedFilename} berhasil diunggah. Simpan Section Hero untuk menerbitkannya.
          </p>
        ) : value ? (
          <p className="text-xs font-semibold text-ink-muted">Model 3D terhubung ke slide ini.</p>
        ) : null}
        {error ? (
          <p role="alert" className="text-xs font-bold text-red-600">
            {error}
          </p>
        ) : null}
      </div>
    </Field>
  );
}

function ImageFieldControl({
  id,
  label,
  help,
  placeholder,
  maxLength,
  value,
  onChange,
}: {
  id: string;
  label: string;
  help?: string;
  placeholder?: string;
  maxLength?: number;
  value: string;
  onChange: (next: unknown) => void;
}) {
  const fileId = `${id}-file`;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    setUploading(true);
    try {
      // Foto besar di-resize/dikompres di browser dulu (pola foto produk),
      // server tetap memvalidasi format & ukuran akhir.
      const { file: prepared } = await optimizeProductImage(file);
      const formData = new FormData();
      formData.append("file", prepared);
      const response = await fetch("/api/admin/site-content/upload", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "x-ofissio-internal-role": "product_admin",
          "x-ofissio-internal-user-id": "product-admin-dev",
        },
        body: formData,
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        url?: string;
        message?: string;
      };
      if (!response.ok || !result.ok || !result.url) {
        setError(result.message ?? "Foto gagal diunggah.");
        return;
      }
      onChange(result.url);
    } catch {
      setError("Foto gagal diunggah. Periksa koneksi lalu coba lagi.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <Field label={label} htmlFor={id} hint={help}>
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          {value ? (
            <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg border border-line bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element -- URL upload bisa dari host media eksternal */}
              <img
                src={value}
                alt={`Pratinjau ${label.toLowerCase()}`}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div
              aria-hidden
              className="grid h-20 w-16 shrink-0 place-items-center rounded-lg border border-dashed border-line-strong bg-slate-50 text-ink-muted"
            >
              <ImagePlus className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <ImagePlus className="h-4 w-4" aria-hidden />
                )}
                {uploading ? "Mengunggah..." : "Unggah foto"}
              </Button>
              {value ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={uploading}
                  onClick={() => onChange("")}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Hapus foto
                </Button>
              ) : null}
              <input
                ref={fileInputRef}
                id={fileId}
                type="file"
                accept={IMAGE_ACCEPT}
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void upload(file);
                }}
              />
            </div>
            <Input
              id={id}
              suppressHydrationWarning
              value={value}
              placeholder={placeholder ?? "URL atau path foto…"}
              maxLength={maxLength}
              onChange={(event) => onChange(event.target.value)}
            />
            {maxLength ? <CharacterCount value={value} max={maxLength} /> : null}
          </div>
        </div>
        {error ? (
          <p role="alert" className="text-xs font-bold text-red-600">
            {error}
          </p>
        ) : null}
      </div>
    </Field>
  );
}

function BusinessFeatureFields({ value, onChange }: { value: IndustriSectionData["businessFeature"]; onChange: (value: NonNullable<IndustriSectionData["businessFeature"]>) => void }) {
  const feature = value ?? { image: "", imageAlt: "Seragam profesional Bisnis Naik Kelas", industry: "Grosir", x: 50, y: 50, fit: "cover" as const };
  return <>
    <FieldRenderer field={{ kind: "image", key: "businessFeatureImage", label: "Foto kolom besar", maxLength: 2000 }} value={feature.image} onChange={(image) => onChange({ ...feature, image: String(image) })} />
    {feature.image && <>
      <FieldRenderer field={{ kind: "text", key: "businessFeatureAlt", label: "Deskripsi foto", maxLength: 200 }} value={feature.imageAlt} onChange={(imageAlt) => onChange({ ...feature, imageAlt: String(imageAlt) })} />
      <label className="block text-sm font-semibold">Halaman tujuan foto<select className="mt-1 block min-h-11 rounded-lg border border-line bg-white px-3" value={feature.industry} onChange={(event) => onChange({ ...feature, industry: event.target.value })}>{INSPIRATION_PAGES.map((page) => <option key={page.industry} value={page.industry}>{page.label}</option>)}</select></label>
      <InspirationPhotoFrameEditor featureOnly value={{ ...DEFAULT_INDUSTRI.inspiration, image: feature.image, imageAlt: feature.imageAlt, homepageFrames: { feature: { x: feature.x, y: feature.y, fit: feature.fit } } }} onChange={(patch) => { const frame = patch.homepageFrames?.feature; if (frame) onChange({ ...feature, ...frame }); }} />
    </>}
  </>;
}
