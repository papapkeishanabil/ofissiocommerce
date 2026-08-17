import { notFound } from "next/navigation";

import { requireInternalAdminServer } from "@/features/admin/admin.service";
import { SupportTicketWorkspace } from "@/features/admin-notifications/components/SupportTicketWorkspace";
import { getSupportTicket } from "@/features/admin-notifications/support-ticket.service";

interface PageProps { params: Promise<{ id: string }> }
export default async function SupportTicketPage({ params }: PageProps) {
  const actor = await requireInternalAdminServer("admin:notification:view");
  const { id } = await params;
  const ticket = await getSupportTicket(id, { role: actor.role, userId: actor.id });
  if (!ticket) notFound();
  return <SupportTicketWorkspace initialTicket={ticket.notification} contact={ticket.contact} />;
}
