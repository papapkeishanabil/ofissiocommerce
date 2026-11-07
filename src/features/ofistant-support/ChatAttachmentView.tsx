"use client";
import type { ChatAttachment } from "./support-context.types";
import { formatIDR } from "@/types/product";
export function ChatAttachmentView({ card, conversationId, staff = false }: { card: ChatAttachment; conversationId: string; staff?: boolean }) {
  const url = card.kind === "product" ? card.url?.startsWith("/product/") ? card.url : "#" : `${staff ? "/api/admin/chats/material" : "/api/ofistant/support/material"}?id=${encodeURIComponent(card.resourceId ?? "")}&conversationId=${encodeURIComponent(conversationId)}`;
  const image = card.kind === "product" ? card.image : card.kind !== "pdf" ? url : undefined;
  return <div className="max-w-72 overflow-hidden rounded-xl border border-slate-200 bg-white text-[#122162]">
    {image && <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Buka ${card.title}`}><img src={image} alt={card.title} className="max-h-64 w-full object-contain" loading="lazy" /></a>}
    <div className="space-y-2 p-3"><strong className="block text-sm">{card.title}</strong>{card.kind === "product" && card.price !== undefined && <p className="text-xs">Mulai {formatIDR(card.price)}</p>}<a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg bg-[#e8a92a] px-3 text-xs font-semibold">{card.kind === "product" ? "Lihat produk" : "Buka / unduh"}</a></div>
  </div>;
}
