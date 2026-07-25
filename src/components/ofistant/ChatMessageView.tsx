// src/components/ofistant/ChatMessageView.tsx
"use client";

import type { ChatMessage } from "@/lib/ofistant/ofistant.types";
import { describeActionType } from "@/lib/ofistant/ofistant.actions";
import { cn } from "@/lib/utils";
import { Sparkles, User } from "lucide-react";

import { ActionPreviewCard } from "./ActionPreviewCard";
import type { AddToCartAction } from "@/lib/ofistant/ofistant.actions";

interface ChatMessageViewProps {
  message: ChatMessage;
  isPendingConfirm: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

export function ChatMessageView({
  message,
  isPendingConfirm,
  onConfirm,
  onCancel,
  busy,
}: ChatMessageViewProps) {
  const isUser = message.role === "user";
  const showActionPreview =
    isPendingConfirm &&
    message.requiresConfirm &&
    message.action?.type === "ADD_TO_CART";

  return (
    <div className={cn("flex gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
      <span
        className={cn(
          "grid h-7 w-7 shrink-0 place-items-center rounded-full text-white",
          isUser ? "bg-slate-700" : "bg-gradient-to-br from-brand-500 to-brand-700",
        )}
        aria-hidden
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
      </span>

      <div className={cn("flex max-w-[85%] flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-3 py-2 text-sm leading-relaxed",
            isUser
              ? "rounded-tr-md bg-brand-600 text-white"
              : "rounded-tl-md bg-surface text-ink shadow-sm ring-1 ring-line",
          )}
        >
          {message.text}
        </div>

        {message.action && !showActionPreview && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-ink-muted">
            → {describeActionType(message.action.type)}
          </span>
        )}

        {showActionPreview && message.action?.type === "ADD_TO_CART" && (
          <ActionPreviewCard
            action={message.action as AddToCartAction}
            onConfirm={onConfirm}
            onCancel={onCancel}
            busy={busy}
          />
        )}

        <time className="px-1 text-[9px] text-ink-muted">
          {new Date(message.ts).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
      </div>
    </div>
  );
}
