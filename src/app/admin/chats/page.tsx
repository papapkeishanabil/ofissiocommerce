import { requireInternalAdminServer } from "@/features/admin/admin.service";
import { SupportInbox } from "@/features/ofistant-support/SupportInbox";
export default async function ChatsPage() {
  const actor = await requireInternalAdminServer("admin:chat:manage");
  return <SupportInbox actorId={actor.id} />;
}
