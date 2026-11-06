import { requireInternalAdminServer } from "@/features/admin/admin.service";
import { SupportInbox } from "@/features/ofistant-support/SupportInbox";
export default async function ChatsPage({ searchParams }: { searchParams: Promise<{ conversation?: string }> }) {
  const actor = await requireInternalAdminServer("admin:chat:manage");
  const { conversation } = await searchParams;
  const id = conversation && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversation) ? conversation : "";
  return <SupportInbox actorId={actor.id} initialConversationId={id} />;
}
