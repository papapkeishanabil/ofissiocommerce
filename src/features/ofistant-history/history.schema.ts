import { z } from "zod";

// Only inert content is restored. Historical actions must never execute again.
export const historyMessageSchema = z.object({
  id: z.string().max(120),
  role: z.enum(["user", "assistant"]),
  text: z.string().max(16000),
  ts: z.number().finite().nonnegative(),
  products: z.array(z.object({
    id: z.string().max(100), slug: z.string().max(250), name: z.string().max(500),
    image: z.string().max(2000).nullable(), material: z.string().max(500).optional(),
    priceFrom: z.number().finite().nonnegative(),
  })).max(3).optional(),
  moreProductsHref: z.string().max(2000).regex(/^\/catalog(?:\?|$)/).optional(),
});
export type HistoryMessage = z.infer<typeof historyMessageSchema>;
export interface ConversationSummary { id: string; title: string; updatedAt: string }
export interface ConversationPage {
  messages: HistoryMessage[];
  before: number | null;
}
export const historyTurnSchema = z.object({
  conversationId: z.string().uuid(),
  turnId: z.string().uuid(),
});
