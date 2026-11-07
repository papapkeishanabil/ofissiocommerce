export interface ChatAttachment {
  kind: "product" | "image" | "pdf" | "chart";
  title: string;
  resourceId?: string;
  url?: string;
  image?: string;
  price?: number;
}
export interface ChatMaterial {
  id: string; title: string; category: string; kind: "image" | "pdf" | "chart";
  active: boolean;
}
export interface ChatCustomerContext {
  profile: { name: string; email: string; whatsapp: string; notes: string };
  orders: { id: string; number: string; status: string; date: string; total: number; products: string[] }[];
  moreOrders: boolean;
}
