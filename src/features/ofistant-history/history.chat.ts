import "server-only";
import type { AuthSession } from "@/features/auth/auth.types";
import { historyCommand } from "./history.repository";
import { historyMessageSchema, historyTurnSchema } from "./history.schema";
import type { OfistantResponse } from "@/lib/ofistant/ofistant.types";

export async function saveChatTurn(session: AuthSession, input: unknown, result: OfistantResponse) {
  const ids = historyTurnSchema.parse(input);
  const message = (input as { message: string }).message;
  const ts = Date.now();
  const messages = [
    historyMessageSchema.parse({ id: `${ids.turnId}-user`, role: "user", text: message, ts }),
    historyMessageSchema.parse({ id: `${ids.turnId}-assistant`, role: "assistant", text: result.message, ts: ts + 1, products: result.products, moreProductsHref: result.moreProductsHref }),
  ];
  await historyCommand(session, "append", { ...ids, title: message.slice(0, 120), messages });
}
