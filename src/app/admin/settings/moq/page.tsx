import { AdminPageHeader } from "@/features/admin/components/AdminSurface";
import { requireInternalAdminServer } from "@/features/admin/admin.service";
import { getMoqSettings } from "@/features/moq-settings/moq-settings.service";
import { MoqSettingsManager } from "@/features/moq-settings/components/MoqSettingsManager";

export default async function AdminMoqSettingsPage() {
  const actor = await requireInternalAdminServer("admin:catalog:view");
  const state = await getMoqSettings();
  const canUpdate = actor.role === "super_admin" || actor.role === "product_admin";
  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Master & pengaturan B2B"
        title="MOQ per Rute"
        description="Satu master minimum order untuk rute Ready Stock (STK), Custom (CUS), Production (PRO), dan batas minimum bordir. MOQ tiap produk tetap sumber kebenaran saat checkout; master ini menjadi default produk baru, aksi terapkan massal, batas keras bordir, dan peringatan Full Custom."
      />
      <MoqSettingsManager initialState={state} canUpdate={canUpdate} />
    </div>
  );
}
