"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { IndustryMaster } from "../catalog-taxonomy.types";

interface IndustryFormState {
  name: string;
  slug: string;
  description: string;
  synonyms: string;
  active: boolean;
  sortOrder: number;
}

const EMPTY_FORM: IndustryFormState = {
  name: "",
  slug: "",
  description: "",
  synonyms: "",
  active: true,
  sortOrder: 100,
};

export function IndustryManager({
  initialIndustries,
}: {
  initialIndustries: IndustryMaster[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function edit(industry: IndustryMaster) {
    setEditingId(industry.id);
    setForm({
      name: industry.name,
      slug: industry.slug,
      description: industry.description,
      synonyms: industry.synonyms.join(", "),
      active: industry.active,
      sortOrder: industry.sortOrder,
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
    startTransition(async () => {
      const response = await fetch(
        editingId
          ? `/api/admin/catalog/industries/${editingId}`
          : "/api/admin/catalog/industries",
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            "x-ofissio-internal-role": "super_admin",
            "x-ofissio-internal-user-id": "internal-dev",
          },
          body: JSON.stringify({
            name: form.name,
            slug: form.slug,
            description: form.description,
            synonyms: commaSeparated(form.synonyms),
            active: form.active,
            sortOrder: form.sortOrder,
          }),
        },
      );
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || !result.ok) {
        setMessage(result.message ?? "Industri belum dapat disimpan.");
        return;
      }
      setMessage(editingId ? "Industri diperbarui." : "Industri ditambahkan.");
      setEditingId(null);
      setForm(EMPTY_FORM);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.5fr)]">
      <section className="rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md">
        <div>
          <p className="type-eyebrow text-brand-700">Ofissio master data</p>
          <h2 className="mt-1 text-xl font-black text-ink">
            {initialIndustries.length} industries
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            Industry berbeda dari kategori produk. Satu produk dapat dipakai
            oleh beberapa industri melalui meta WooCommerce <code>industries</code>.
          </p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {initialIndustries.map((industry) => (
            <article
              key={industry.id}
              className="rounded-2xl border border-line/80 bg-slate-50/70 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-ink">{industry.name}</h3>
                    <span className={industry.active ? "text-xs font-black text-emerald-700" : "text-xs font-black text-slate-500"}>
                      {industry.active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-brand-700">
                    {industry.slug}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => edit(industry)}
                  aria-label={`Edit industri ${industry.name}`}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-white text-ink-muted hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <p className="mt-3 min-h-10 text-sm leading-5 text-ink-muted">
                {industry.description || "Belum ada deskripsi."}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {industry.synonyms.map((synonym) => (
                  <span
                    key={synonym}
                    className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink-muted ring-1 ring-line"
                  >
                    {synonym}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-xs font-bold text-ink-subtle">
                Sort order {industry.sortOrder}
              </p>
            </article>
          ))}
        </div>
      </section>

      <form
        onSubmit={submit}
        className="h-fit rounded-[1.75rem] border border-white/75 bg-white/95 p-5 shadow-soft-md xl:sticky xl:top-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="type-eyebrow text-brand-700">
              {editingId ? "Edit industry" : "New industry"}
            </p>
            <h2 className="mt-1 text-xl font-black text-ink">Industry master</h2>
          </div>
          {editingId ? (
            <button
              type="button"
              onClick={reset}
              aria-label="Batalkan edit industri"
              className="grid h-11 w-11 place-items-center rounded-xl border border-line text-ink-muted hover:text-brand-700"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <div className="mt-5 space-y-4">
          <LabeledInput
            label="Name"
            value={form.name}
            required
            onChange={(value) => setForm({ ...form, name: value })}
          />
          <LabeledInput
            label="Slug"
            value={form.slug}
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            onChange={(value) => setForm({ ...form, slug: value })}
          />
          <label className="block text-sm font-bold text-ink">
            Description
            <textarea
              rows={3}
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm font-normal focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <LabeledInput
            label="Ofistant synonyms"
            value={form.synonyms}
            placeholder="tambang, pertambangan, mining"
            onChange={(value) => setForm({ ...form, synonyms: value })}
          />
          <LabeledInput
            label="Sort order"
            type="number"
            min={0}
            value={String(form.sortOrder)}
            onChange={(value) =>
              setForm({ ...form, sortOrder: Number(value) || 0 })
            }
          />
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-slate-50 px-3 text-sm font-bold text-ink">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) =>
                setForm({ ...form, active: event.target.checked })
              }
              className="h-4 w-4 accent-brand-700"
            />
            Aktif untuk customer taxonomy
          </label>
        </div>
        {message ? (
          <p className="mt-4 text-sm font-semibold text-brand-700" role="status">
            {message}
          </p>
        ) : null}
        <Button type="submit" disabled={isPending} className="mt-5 w-full">
          <Plus className="h-4 w-4" aria-hidden="true" />
          {isPending
            ? "Menyimpan..."
            : editingId
              ? "Simpan perubahan"
              : "Tambah industri"}
        </Button>
      </form>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  ...inputProps
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className="block text-sm font-bold text-ink">
      {label}
      <Input
        {...inputProps}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2"
      />
    </label>
  );
}

function commaSeparated(value: string) {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}
