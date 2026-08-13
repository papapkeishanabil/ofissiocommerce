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
//   list    -> repeating cards (one per item) with add/remove
//
// Phase 1 sections are flat { items: [...] } shapes, but the renderer already
// recurses through itemFields so Phase 2/3 field types slot in without
// touching this scaffolding.

"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Plus,
  RotateCcw,
  Save,
  ShieldAlert,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { AdminPanel } from "@/features/admin/components/AdminSurface";
import {
  HOMEPAGE_ICON_KEYS,
  resolveHomepageIcon,
} from "@/features/site-content/icon-registry";
import type { FieldDescriptor, SectionKey } from "@/features/site-content/content.schema";
import { cn } from "@/lib/utils";

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

/** Build a fresh blank item from its field descriptors (icon -> Sparkles, text -> ""). */
function blankItem(itemFields: FieldDescriptor[]): Record<string, unknown> {
  const item: Record<string, unknown> = {};
  for (const f of itemFields) {
    if (f.kind === "icon") item[f.key] = "Sparkles";
    else if (f.kind === "text" || f.kind === "textarea") item[f.key] = "";
  }
  return item;
}

function itemCount(data: unknown): number | null {
  const items = (data as { items?: unknown[] } | null)?.items;
  return Array.isArray(items) ? items.length : null;
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
        {fields.map((field) => (
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

  // list
  const items = Array.isArray(value) ? (value as unknown[]) : [];
  return (
    <Field label={field.label} hint={field.help}>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="rounded-xl border border-line bg-slate-50/60 p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.08em] text-ink-muted">
                {field.itemLabel} #{index + 1}
              </span>
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
            <div className="space-y-3">
              {field.itemFields.map((f) => (
                <FieldRenderer
                  key={f.key}
                  field={f}
                  value={(item as Record<string, unknown>)[f.key]}
                  onChange={(v) =>
                    onChange(
                      items.map((it, i) =>
                        i === index
                          ? { ...(it as Record<string, unknown>), [f.key]: v }
                          : it,
                      ),
                    )
                  }
                />
              ))}
            </div>
          </div>
        ))}
        {!field.max || items.length < field.max ? (
          <button
            type="button"
            onClick={() => onChange([...items, blankItem(field.itemFields)])}
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

function CharacterCount({ value, max }: { value: string; max: number }) {
  return (
    <p className="text-[11px] tabular-nums text-ink-muted">
      {value.length}/{max}
    </p>
  );
}
