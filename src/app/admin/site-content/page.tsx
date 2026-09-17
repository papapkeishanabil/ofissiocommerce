// src/app/admin/site-content/page.tsx
// Admin landing for the homepage CMS: one card per editable section, linking
// to its [section] editor. Mirrors the embroidery pricing page shape
// (requireInternalAdminServer -> service read -> AdminPageHeader + content)
// but lists multiple sections instead of a single editor.
import Link from "next/link";
import { CheckCircle2, ChevronRight, ShieldAlert } from "lucide-react";

import { requireInternalAdminServer } from "@/features/admin/admin.service";
import { AdminPageHeader } from "@/features/admin/components/AdminSurface";
import { getSiteContent } from "@/features/site-content/site-content.service";
import { cn } from "@/lib/utils";

export default async function AdminSiteContentPage() {
  await requireInternalAdminServer("admin:content:view");
  const state = await getSiteContent();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Website CMS"
        title="Konten Website"
        description="Ubah teks, media, kartu homepage, dan halaman inspirasi. Perubahan tersimpan ke site_content dan tampil di publik setelah disimpan."
      >
        <span
          className={cn(
            "inline-flex min-h-8 items-center gap-2 rounded-full px-3 text-xs font-black uppercase tracking-[0.14em]",
            state.schemaReady
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-800",
          )}
        >
          {state.schemaReady ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <ShieldAlert className="h-4 w-4" />
          )}
          {state.source}
        </span>
      </AdminPageHeader>

      {!state.schemaReady ? (
        <div
          role="alert"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900"
        >
          Migration 025 (tabel <span className="font-mono">site_content</span>) belum aktif.
          Editor menampilkan nilai bawaan; penyimpanan Supabase aktif setelah migrasi dijalankan.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {state.sections.map((section) => {
          const count = itemCount(section.data);
          return (
            <Link
              key={section.key}
              href={`/admin/site-content/${section.key}`}
              className="group flex flex-col gap-3 rounded-xl border border-line bg-white p-5 shadow-soft-sm transition hover:border-brand-200 hover:bg-brand-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold tracking-tight text-ink">
                  {section.label}
                </h3>
                <ChevronRight
                  className="h-5 w-5 shrink-0 text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-brand-700"
                  aria-hidden
                />
              </div>
              <p className="text-sm leading-6 text-ink-muted">{section.description}</p>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-1 text-xs font-semibold">
                {count !== null ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-ink-muted">
                    {count} item
                  </span>
                ) : null}
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1",
                    section.hasRow
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-800",
                  )}
                >
                  {section.hasRow ? "tersimpan" : "bawaan"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function itemCount(data: unknown): number | null {
  const items = (data as { items?: unknown[] } | null)?.items;
  return Array.isArray(items) ? items.length : null;
}
