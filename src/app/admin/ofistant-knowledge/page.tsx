import { requireInternalAdminServer } from "@/features/admin/admin.service";
import { AdminPageHeader } from "@/features/admin/components/AdminSurface";
import { OfistantKnowledgeManager } from "@/features/ofistant-knowledge/OfistantKnowledgeManager";
import { listKnowledgeArticles } from "@/features/ofistant-knowledge/ofistant-knowledge.service";

export default async function OfistantKnowledgePage() {
  const user = await requireInternalAdminServer("admin:knowledge:view");
  const articles = await listKnowledgeArticles();
  return <div className="space-y-6">
    <AdminPageHeader eyebrow="Ofistant" title="Knowledge Base Ofistant" description="Kelola jawaban resmi untuk FAQ, kebijakan, pembayaran, custom, produksi, dan pengiriman. Ofistant hanya membaca artikel berstatus Published." />
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-brand-900"><strong>Pemisahan kewenangan:</strong> Admin/CS dapat menulis draft. Hanya Super Admin yang dapat menerbitkan atau mengarsipkan artikel agar jawaban customer selalu melalui kontrol kualitas.</div>
    <OfistantKnowledgeManager initialArticles={articles} canPublish={user.role === "super_admin"} />
  </div>;
}
