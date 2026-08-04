import { AdminPageHeader } from "@/features/admin/components/AdminSurface";
import { requireInternalAdminServer } from "@/features/admin/admin.service";
import { EmbroideryPricingManager } from "@/features/embroidery-pricing/components/EmbroideryPricingManager";
import { getGlobalEmbroideryPricing } from "@/features/embroidery-pricing/global-embroidery-pricing.service";

export default async function AdminEmbroideryPricingPage() {
  const actor = await requireInternalAdminServer("admin:catalog:view");
  const state = await getGlobalEmbroideryPricing();
  const canUpdate = actor.role === "super_admin" || actor.role === "product_admin";
  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Global customization pricing"
        title="Harga Bordir"
        description="Satu master harga untuk seluruh katalog. Produk hanya menentukan zona yang didukung; cart, quotation, dan Ofistant memakai nilai global yang sama."
      />
      <EmbroideryPricingManager initialState={state} canUpdate={canUpdate} />
    </div>
  );
}
