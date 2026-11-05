import Link from "next/link";
import { notFound } from "next/navigation";
import { requireInternalAdminServer } from "@/features/admin/admin.service";
import { readPage } from "@/features/page-builder/page.repository";
import { PageBuilder } from "@/features/page-builder/PageBuilder";
export const dynamic = "force-dynamic";
export const metadata = { title: "Page Builder", robots: { index: false, follow: false } };
export default async function AdminPageBuilder({ params }: {
    params: Promise<{
        slug: string;
    }>;
}) {
    const actor = await requireInternalAdminServer("admin:content:view");
    const { slug } = await params;
    if (slug !== "about-us")
        notFound();
    let state;
    try {
        state = await readPage(slug);
    }
    catch {
        return <div className="space-y-4 rounded-xl bg-white p-8"><h1 className="text-xl font-bold">Page Builder belum siap</h1><p>Periksa konfigurasi database dan migration 040. Tidak ada perubahan yang disimpan.</p><Link href="/admin/site-content">Kembali ke Konten Website</Link></div>;
    }
    return <div><Link href="/admin/site-content" className="text-sm underline">Kembali ke Konten Website</Link><PageBuilder initial={state} canUpdate={actor.role === "super_admin" || actor.role === "product_admin"}/></div>;
}
