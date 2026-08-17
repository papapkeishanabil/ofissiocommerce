import { AdminQuotationWorkspace } from "@/features/admin/components/AdminQuotationWorkspace";
import { requireInternalAdminServer } from "@/features/admin/admin.service";

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminRequestsPage({ searchParams }: PageProps) {
  const actor = await requireInternalAdminServer("admin:quotation:view");
  return AdminQuotationWorkspace({
    searchParams,
    workspace: "request",
    viewerRole: actor.role,
    viewerUserId: actor.id,
  });
}
