// src/app/admin/site-content/[section]/page.tsx
// Editor route for one homepage section. Guards the view permission, 404s on
// an unknown section key, then hands the registry entry + current effective
// data to the client editor. Mirrors the embroidery pricing page: RSC reads,
// client component owns the form.
import { notFound } from "next/navigation";
import { Info } from "lucide-react";

import { requireInternalAdminServer } from "@/features/admin/admin.service";
import { AdminBackLink, AdminPageHeader } from "@/features/admin/components/AdminSurface";
import { SiteContentEditor } from "@/features/site-content/components/SiteContentEditor";
import {
  getSectionEntry,
  isSiteContentSection,
} from "@/features/site-content/content.schema";
import { getSiteContent } from "@/features/site-content/site-content.service";

interface PageProps {
  params: Promise<{ section: string }>;
}

export default async function AdminSiteContentSectionPage({ params }: PageProps) {
  const { section: rawSection } = await params;
  const actor = await requireInternalAdminServer("admin:content:view");
  if (!isSiteContentSection(rawSection)) notFound();

  const entry = getSectionEntry(rawSection);
  const state = await getSiteContent();
  const sectionState = state.sections.find((s) => s.key === rawSection);
  // The service always returns effective data for every registered section
  // (validated row or the registry default), so this is non-null in practice.
  const data = sectionState?.data ?? entry?.default;
  const canUpdate = actor.role === "super_admin" || actor.role === "product_admin";

  return (
    <div className="space-y-6">
      <AdminBackLink href="/admin/site-content">Kembali ke daftar konten</AdminBackLink>
      <AdminPageHeader
        eyebrow="Website CMS"
        title={entry?.label ?? rawSection}
        description={entry?.description}
      />
      <div className="flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" aria-hidden />
        <p>
          Nomor section di CMS adalah nomor struktur asli dan tetap. Homepage dapat menampilkan
          nomor visual yang berbeda jika section lain disembunyikan, jadi unggah gambar berdasarkan
          nama section ini, bukan nomor visual di homepage.
        </p>
      </div>
      <SiteContentEditor
        section={rawSection}
        label={entry?.label ?? rawSection}
        description={entry?.description ?? ""}
        fields={entry?.fields ?? []}
        defaultValue={entry?.default}
        initialState={{ data, source: state.source, schemaReady: state.schemaReady }}
        canUpdate={canUpdate}
      />
    </div>
  );
}
