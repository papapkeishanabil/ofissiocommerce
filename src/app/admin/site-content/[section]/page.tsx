// src/app/admin/site-content/[section]/page.tsx
// Editor route for one homepage section. Guards the view permission, 404s on
// an unknown section key, then hands the registry entry + current effective
// data to the client editor. Mirrors the embroidery pricing page: RSC reads,
// client component owns the form.
import { notFound } from "next/navigation";

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
