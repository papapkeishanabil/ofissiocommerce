export interface SupportConversation {
  id: string;
  customerName: string;
  status: "waiting" | "active" | "closed";
  staffId: string | null;
  staffName: string | null;
  updatedAt: string;
}
export interface SupportMessage {
  id: string;
  sequence: number;
  role: "user" | "assistant" | "staff" | "system";
  name: string;
  text: string;
  ts: number;
  context: boolean;
}
export interface SupportResult {
  enabled?: boolean;
  conversation: SupportConversation | null;
  messages: SupportMessage[];
  next: number;
  more: boolean;
}
