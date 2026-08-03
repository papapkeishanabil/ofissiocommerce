"use client";

import type { ChatMessage } from "@/lib/ofistant/ofistant.types";
import { describeActionType } from "@/lib/ofistant/ofistant.actions";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

import { ActionPreviewCard } from "./ActionPreviewCard";
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
        "grid h-8 w-8 shrink-0 place-items-center rounded-full",
        isUser
          ? "border border-line bg-surface-muted"
          : "bg-brand-700 text-white shadow-soft-xs",
      )}>
        {isUser ? (
          <span className="text-[11px] font-bold text-ink-muted">You</span>
        ) : (
          <Sparkles className="h-4 w-4 text-ochre-300" strokeWidth={2.2} />
        )}
      </span>

      <div className={cn("flex max-w-[82%] flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
        {/* Bubble */}
        <div className={cn(
          "rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-soft-xs",
          isUser
            ? "rounded-tr-sm bg-brand-700 text-white"
            : "rounded-tl-md border border-line bg-white text-ink",
        )}>
          {message.text}
        </div>

        {/* Inline action badge */}
        {message.action && !showActionPreview && (
          <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-1 text-[10px] font-semibold text-brand-700">
            <span className="h-1 w-1 rounded-full bg-ochre-500" />
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
