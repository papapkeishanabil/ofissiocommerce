import { ADMIN_ROLE_PERMISSIONS } from "@/features/admin/admin.config";
import { requireInternalAdminServer } from "@/features/admin/admin.service";
import { GineeIntegrationPanel } from "@/features/integrations/ginee/components/GineeIntegrationPanel";
import {
  getGineeHealth,
  listGineeMappings,
  listGineeWebhookEvents,
  listRecentGineeOrders,
} from "@/features/integrations/ginee/ginee.service";

export const dynamic = "force-dynamic";

export default async function AdminGineeIntegrationPage() {
  const actor = await requireInternalAdminServer("admin:integration:ginee:view");
  const permissions = ADMIN_ROLE_PERMISSIONS[actor.role] ?? [];
  const [health, orders, mappings, events] = await Promise.all([
    getGineeHealth().catch(() => null),
    permissions.includes("admin:integration:ginee:sync_read")
      ? listRecentGineeOrders().catch(() => [])
      : Promise.resolve([]),
    listGineeMappings().catch(() => []),
    listGineeWebhookEvents().catch(() => []),
  ]);

  return (
    <GineeIntegrationPanel
      initialHealth={health}
      initialOrders={orders}
      initialMappings={mappings}
      initialEvents={events}
      canReadSync={permissions.includes("admin:integration:ginee:sync_read")}
      canUpdate={permissions.includes("admin:integration:ginee:update")}
    />
  );
}
