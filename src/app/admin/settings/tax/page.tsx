import { requireInternalAdminServer } from "@/features/admin/admin.service";
import { AdminPageHeader } from "@/features/admin/components/AdminSurface";
import { AdminTaxSettingsForm } from "@/features/tax/components/AdminTaxSettingsForm";
import { getGlobalTaxSettings } from "@/features/tax/tax.service";

export default async function AdminTaxSettingsPage() {
  const actor = await requireInternalAdminServer("admin:tax:view");
  const state = await getGlobalTaxSettings();
  const canUpdate = ["super_admin", "finance_internal", "finance_admin"].includes(actor.role);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Commercial settings"
        title="Pengaturan PPN"
        description="Tetapkan status dan tarif PPN default. Setiap quotation menyimpan snapshot sendiri agar perubahan tarif tidak mengubah penawaran yang sudah dibuat."
      />
      <AdminTaxSettingsForm initialState={state} canUpdate={canUpdate} />
    </div>
  );
}
