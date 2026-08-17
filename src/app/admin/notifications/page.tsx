import { AdminNotificationCenter } from "@/features/admin-notifications/components/AdminNotificationCenter";
import { requireInternalAdminServer } from "@/features/admin/admin.service";

interface PageProps {
  searchParams?: Promise<{ focus?: string }>;
}

export default async function AdminNotificationsPage({ searchParams }: PageProps) {
  await requireInternalAdminServer("admin:notification:view");
  const focus = (await searchParams)?.focus;
  return <AdminNotificationCenter initialFocus={focus} />;
}
