import { AdminUserManager } from "@/features/admin-users/components/AdminUserManager";
import { listManagedInternalUsers } from "@/features/admin-users/admin-user.service";
import { requireInternalAdminServer } from "@/features/admin/admin.service";
import { AdminPageHeader } from "@/features/admin/components/AdminSurface";
import { ADMIN_ROLE_PERMISSIONS } from "@/features/admin/admin.config";

export default async function AdminUsersPage() {
  const actor = await requireInternalAdminServer("admin:user:view");
  const users = await listManagedInternalUsers();
  return <div className="space-y-6">
    <AdminPageHeader
      eyebrow="Akses internal"
      title="Tim Ofissio"
      description="Kelola akun Admin dan CS Ofissio. Admin menangani STK/CUS, sedangkan CS berfokus pada konsultasi Full Custom dan Production (PRO)."
    />
    <AdminUserManager initialUsers={users} actorId={actor.id} canManage={ADMIN_ROLE_PERMISSIONS[actor.role].includes("admin:user:update")} />
  </div>;
}
