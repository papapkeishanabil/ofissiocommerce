import { requireInternalAdminServer } from "@/features/admin/admin.service";
import { AdminPageHeader } from "@/features/admin/components/AdminSurface";
import { AdminPromotionManager } from "@/features/promotions/components/AdminPromotionManager";

export default async function AdminPromotionsPage() {
  await requireInternalAdminServer("admin:catalog:view");
  return <div className="space-y-6"><AdminPageHeader eyebrow="Commercial tools" title="Promo & Kupon" description="Buat dan kelola kode promo WooCommerce langsung dari Ofissio Admin." /><AdminPromotionManager /></div>;
}
