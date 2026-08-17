"use client";

import type { ChatMessage } from "@/lib/ofistant/ofistant.types";
import { describeActionType } from "@/lib/ofistant/ofistant.actions";
import { cn } from "@/lib/utils";
import { OfistantMark } from "./OfistantMark";

import { ActionPreviewCard } from "./ActionPreviewCard";
import { AssistantMessageText } from "./AssistantMessageText";
import type { AddToCartAction } from "@/lib/ofistant/ofistant.actions";

interface ChatMessageViewProps {
  message: ChatMessage;
  isPendingConfirm: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

export function ChatMessageView({ message, isPendingConfirm, onConfirm, onCancel, busy }: ChatMessageViewProps) {
  const isUser = message.role === "user";
  const showActionPreview = isPendingConfirm && message.requiresConfirm && message.action?.type === "ADD_TO_CART";

  return (
    <div className={cn("group/msg flex gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <span aria-hidden className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-full",
        isUser
          ? "border border-line bg-white text-ink-muted shadow-soft-xs"
          : "bg-brand-700 text-white shadow-soft-sm",
      )}>
        {isUser ? (
          <span className="text-[11px] font-extrabold text-ink-muted">Anda</span>
        ) : (
          <OfistantMark variant="rev" className="h-5 w-5" />
        )}
      </span>

      <div className={cn("flex max-w-[82%] flex-col gap-1", isUser ? "items-end" : "items-start")}>
        {/* Bubble */}
        <div className={cn(
          "px-4 py-2.5 text-[15px] leading-relaxed",
          isUser
            ? "rounded-2xl rounded-tr-md bg-brand-700 text-white shadow-soft-sm"
            : "rounded-2xl rounded-tl-md border border-white/70 bg-white/80 text-ink shadow-soft-sm backdrop-blur",
        )}>
          {isUser ? message.text : <AssistantMessageText text={message.text} />}
        </div>

        {/* Timestamp */}
        <span className={cn(
          "px-1 text-[10px] font-medium text-ink-subtle",
          isUser ? "text-right" : "text-left",
        )}>
          {formatChatTime(message.ts)}
        </span>

        {/* Inline action badge */}
        {message.action && !showActionPreview && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
            <span className="h-1.5 w-1.5 rounded-full bg-ochre-500" />
            → {describeActionType(message.action.type)}
          </span>
        )}

        {/* Confirmation preview card */}
        {showActionPreview && message.action?.type === "ADD_TO_CART" && (
          <ActionPreviewCard action={message.action as AddToCartAction} onConfirm={onConfirm} onCancel={onCancel} busy={busy} />
        )}
      </div>
    </div>
  );
}

function formatChatTime(ts: number | undefined) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
