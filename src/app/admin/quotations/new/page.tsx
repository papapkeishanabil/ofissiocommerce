import { AdminSalesAssistedQuotationForm } from "@/features/admin/components/AdminSalesAssistedQuotationForm";
import {
  listAdminCustomers,
  requireInternalAdminServer,
} from "@/features/admin/admin.service";
import {
  AdminBackLink,
  AdminPageHeader,
} from "@/features/admin/components/AdminSurface";

export default async function AdminNewSalesAssistedQuotationPage() {
  await requireInternalAdminServer("admin:quotation:update");
  const customers = await listAdminCustomers();

  return (
    <div className="space-y-5">
      <AdminBackLink href="/admin/quotations">Kembali ke quotations</AdminBackLink>
      <AdminPageHeader
        eyebrow="Sales-assisted custom brief"
        title="Catat brief Full Custom untuk approval customer"
        description="Gunakan halaman ini ketika kebutuhan diterima melalui WhatsApp, telepon, email, atau pertemuan. Setelah disimpan, customer meninjau dan menyetujui brief sebelum tim Ofissio memproses quotation."
      />
      <AdminSalesAssistedQuotationForm customers={customers} />
    </div>
  );
}
