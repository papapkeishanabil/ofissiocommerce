import { AdminNotificationCenter } from "@/features/admin-notifications/components/AdminNotificationCenter";
import { requireInternalAdmin } from "@/features/admin/admin.service";

export default function AdminNotificationsPage() {
  requireInternalAdmin(undefined, "admin:notification:view");
  return <AdminNotificationCenter />;
}
