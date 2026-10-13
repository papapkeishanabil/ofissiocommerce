"use client";

import { useId, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { DEFAULT_INDUSTRY_INSPIRATION, industryInspirationSchema } from "../content.schema";
import type { IndustryInspirationData } from "../content.schema";
import { INSPIRATION_PAGES, INSPIRATION_ROUTES } from "../industry-inspiration.routes";
import { resolveInspirationPage } from "../industry-inspiration.content";
import { IndustryInspirationEditor } from "./IndustryInspirationEditor";
import { CafeInspirationEditor } from "./CafeInspirationEditor";

export function IndustryInspirationPagesEditor({ label, help, legacy, value, onChange }: {
  label: string;
  help?: string;
  legacy: unknown;
  value: unknown;
  onChange: (page: IndustryInspirationData) => void;
}) {
  const id = useId();
  const [slug, setSlug] = useState("bengkel-teknisi");
  const page = INSPIRATION_PAGES.find((item) => item.slug === slug) ?? { industry: "Bengkel" as const, ...INSPIRATION_ROUTES.Bengkel };
  // The server validates persisted data. Keep in-progress form values here,
  // including an temporarily empty title while typing; validate on Save.
  const pages = Array.isArray(value) ? value as IndustryInspirationData[] : [];
  const previous = industryInspirationSchema.safeParse(legacy);
  const data = resolveInspirationPage(page, {
    inspiration: previous.success ? previous.data : DEFAULT_INDUSTRY_INSPIRATION,
    inspirationPages: pages,
  });

  return (
    <div className="space-y-5">
      <Field label={label} htmlFor={id} hint={help}>
        <Select id={id} value={page.slug} onChange={(event) => setSlug(event.target.value)}>
          {(["business", "corporate"] as const).map((group) => (
            <optgroup key={group} label={group === "business" ? "Bisnis Naik Kelas" : "Solusi Korporasi"}>
              {INSPIRATION_PAGES.filter((item) => item.group === group).map((item) => (
                <option key={item.slug} value={item.slug}>{item.label}</option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Field>
      <a href={`/inspirasi/${page.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">
        Buka halaman {page.label} yang tersimpan <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </a>
      {page.industry === "F&B" ? <CafeInspirationEditor value={data} onChange={onChange} /> : <IndustryInspirationEditor
        key={page.slug}
        label={`Inspirasi ${page.label}`}
        help="Gambar bawaan adalah referensi tampilan. Unggah foto unggulan yang sesuai, sesuaikan manfaat dengan produknya, lalu periksa posisi pin sebelum menyimpan."
        value={data}
        onChange={(next) => onChange({ ...next, slug: page.slug, industry: page.industry })}
      />}
    </div>
  );
}
