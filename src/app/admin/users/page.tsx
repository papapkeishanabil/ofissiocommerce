import { AdminUserManager } from "@/features/admin-users/components/AdminUserManager";
import { listManagedInternalUsers } from "@/features/admin-users/admin-user.service";
import { requireInternalAdminServer } from "@/features/admin/admin.service";
import { AdminPageHeader } from "@/features/admin/components/AdminSurface";

export default async function AdminUsersPage() {
  await requireInternalAdminServer("admin:user:view");
  const users = await listManagedInternalUsers();
  return <div className="space-y-6">
    <AdminPageHeader
      eyebrow="Akses internal"
      title="Tim Ofissio"
      description="Kelola akun Admin dan CS Ofissio. Admin menangani STK/CUS, sedangkan CS berfokus pada konsultasi Full Custom dan Production (PRO)."
    />
    <AdminUserManager initialUsers={users} />
  </div>;
}
