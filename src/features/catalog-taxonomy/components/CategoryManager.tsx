"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Pencil, Plus, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { CatalogCategory } from "../catalog-taxonomy.types";

interface CategoryFormState {
  name: string;
  slug: string;
  description: string;
  synonyms: string;
  active: boolean;
}

const EMPTY_FORM: CategoryFormState = {
  name: "",
  slug: "",
  description: "",
  synonyms: "",
  active: true,
};

export function CategoryManager({
  initialCategories,
}: {
  initialCategories: CatalogCategory[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function edit(category: CatalogCategory) {
    setEditingId(category.id);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description,
      synonyms: category.synonyms.join(", "),
      active: category.active,
    });
    setMessage(null);
  }

  function reset() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setMessage(null);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const payload = {
      name: form.name,
      ...(form.slug ? { slug: form.slug } : {}),
      description: form.description,
      active: form.active,
      synonyms: commaSeparated(form.synonyms),
    };
    startTransition(async () => {
      const response = await fetch(
        editingId
          ? `/api/admin/catalog/categories/${editingId}`
          : "/api/admin/catalog/categories",
        {
          method: editingId ? "PATCH" : "POST",
          headers: adminHeaders(),
          body: JSON.stringify(payload),
        },
      );
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || !result.ok) {
        setMessage(result.message ?? "Kategori belum dapat disimpan.");
        return;
      }
      setMessage(editingId ? "Kategori diperbarui." : "Kategori dibuat.");
      setEditingId(null);
      setForm(EMPTY_FORM);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
      <section
        aria-labelledby="category-list-title"
        className="rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="type-eyebrow text-brand-700">WooCommerce source</p>
            <h2 id="category-list-title" className="mt-1 text-xl font-black text-ink">
              {initialCategories.length} categories
            </h2>
          </div>
          <p className="max-w-md text-xs leading-5 text-ink-muted">
            Nama, slug, dan deskripsi disimpan di WooCommerce. Active state dan
            synonyms adalah metadata Ofissio.
          </p>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {initialCategories.map((category) => (
            <article
              key={category.id}
              className="rounded-2xl border border-line/80 bg-slate-50/70 p-4 transition hover:border-brand-200 hover:bg-brand-50/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-ink">{category.name}</h3>
                    <Status active={category.active} />
                  </div>
                  <p className="mt-1 font-mono text-xs text-brand-700">
                    /{category.slug}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => edit(category)}
                  aria-label={`Edit kategori ${category.name}`}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-white text-ink-muted transition hover:border-brand-300 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-ink-muted">
                {category.description || "Belum ada deskripsi kategori."}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {category.synonyms.length ? (
                  category.synonyms.map((synonym) => (
                    <span
                      key={synonym}
                      className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink-muted ring-1 ring-line"
                    >
                      {synonym}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-ink-subtle">No synonyms</span>
                )}
              </div>
              <p className="mt-4 text-xs font-bold text-ink-muted">
                {category.productCount} product
                {category.productCount === 1 ? "" : "s"}
              </p>
            </article>
          ))}
        </div>
      </section>

      <CategoryForm
        editing={editingId !== null}
        form={form}
        isPending={isPending}
        message={message}
        onChange={setForm}
        onReset={reset}
        onSubmit={submit}
      />
    </div>
  );
}

function CategoryForm(props: {
  editing: boolean;
  form: CategoryFormState;
  isPending: boolean;
  message: string | null;
  onChange: (state: CategoryFormState) => void;
  onReset: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      onSubmit={props.onSubmit}
      className="h-fit rounded-[1.75rem] border border-white/75 bg-white/95 p-5 shadow-soft-md xl:sticky xl:top-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="type-eyebrow text-brand-700">
            {props.editing ? "Edit category" : "New category"}
          </p>
          <h2 className="mt-1 text-xl font-black text-ink">
            {props.editing ? "Update taxonomy" : "Add to WooCommerce"}
          </h2>
        </div>
        {props.editing ? (
          <button
            type="button"
            onClick={props.onReset}
            aria-label="Batalkan edit kategori"
            className="grid h-11 w-11 place-items-center rounded-xl border border-line text-ink-muted hover:text-brand-700"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div className="mt-5 space-y-4">
        <Field label="Name" required>
          <Input
            required
            value={props.form.name}
            onChange={(event) =>
              props.onChange({ ...props.form, name: event.target.value })
            }
          />
        </Field>
        <Field label="Slug">
          <Input
            value={props.form.slug}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder="contoh: kemeja"
            onChange={(event) =>
              props.onChange({ ...props.form, slug: event.target.value })
            }
          />
        </Field>
        <Field label="Description">
          <textarea
            value={props.form.description}
            rows={3}
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            onChange={(event) =>
              props.onChange({ ...props.form, description: event.target.value })
            }
          />
        </Field>
        <Field
          label="Ofistant synonyms"
          hint="Pisahkan dengan koma. Contoh: polo, polo shirt."
        >
          <Input
            value={props.form.synonyms}
            placeholder="alias satu, alias dua"
            onChange={(event) =>
              props.onChange({ ...props.form, synonyms: event.target.value })
            }
          />
        </Field>
        <label className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-slate-50 px-3 text-sm font-bold text-ink">
          <input
            type="checkbox"
            checked={props.form.active}
            onChange={(event) =>
              props.onChange({ ...props.form, active: event.target.checked })
            }
            className="h-4 w-4 accent-brand-700"
          />
          Aktif untuk katalog dan Ofistant
        </label>
      </div>
      {props.message ? (
        <p className="mt-4 text-sm font-semibold text-brand-700" role="status">
          {props.message}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={props.isPending}
        className="mt-5 w-full"
      >
        {props.editing ? (
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Plus className="h-4 w-4" aria-hidden="true" />
        )}
        {props.isPending
          ? "Menyimpan..."
          : props.editing
            ? "Simpan perubahan"
            : "Tambah kategori"}
      </Button>
    </form>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-ink">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      {hint ? <span className="mt-0.5 block text-xs text-ink-muted">{hint}</span> : null}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function Status({ active }: { active: boolean }) {
  return (
    <span
      className={
        active
          ? "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700"
          : "inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600"
      }
    >
      <span className={active ? "h-1.5 w-1.5 rounded-full bg-emerald-500" : "h-1.5 w-1.5 rounded-full bg-slate-500"} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function commaSeparated(value: string) {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

function adminHeaders() {
  return {
    "Content-Type": "application/json",
    "x-ofissio-internal-role": "super_admin",
    "x-ofissio-internal-user-id": "internal-dev",
  };
}
