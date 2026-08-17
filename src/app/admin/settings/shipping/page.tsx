import { requireInternalAdminServer } from "@/features/admin/admin.service";
import { AdminPageHeader } from "@/features/admin/components/AdminSurface";
import { AdminShippingSettingsForm } from "@/features/shipping-settings/components/AdminShippingSettingsForm";
import { getShippingSettingsAdminState } from "@/features/shipping-settings/shipping-settings.service";

export default async function AdminShippingSettingsPage() {
  const actor = await requireInternalAdminServer("admin:settings:view");
  const { settings, catalog } = await getShippingSettingsAdminState();
  const canUpdate = actor.role === "super_admin";
  return <div className="space-y-6">
    <AdminPageHeader eyebrow="Logistics settings" title="Kurir Checkout" description="Pilih kurir dan layanan Biteship yang ditampilkan pada cek ongkir customer." />
    <AdminShippingSettingsForm initialSettings={settings} catalog={catalog} canUpdate={canUpdate} />
  </div>;
}
