import { AdminGuideBrowser } from "@/features/admin-guide/components/AdminGuideBrowser";
import { requireInternalAdminServer } from "@/features/admin/admin.service";

export const metadata = { title: "Panduan Kerja | Ofissio Admin" };

export default async function AdminHelpPage() {
  await requireInternalAdminServer("admin:view");
  return <AdminGuideBrowser />;
}
