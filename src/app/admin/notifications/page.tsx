import { AdminNotificationCenter } from "@/features/admin-notifications/components/AdminNotificationCenter";
import { requireInternalAdminServer } from "@/features/admin/admin.service";

export default async function AdminNotificationsPage() {
  await requireInternalAdminServer("admin:notification:view");
  return <AdminNotificationCenter />;
}
