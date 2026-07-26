// src/components/ofistant/ChatMessageView.tsx
// Modern AI-grade chat bubbles. AI messages feel crafted (gradient avatar,
// subtle surface, depth), user messages feel direct (filled, right-aligned).

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
    <div
      className={cn(
        "group/msg flex gap-2.5",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      {/* Avatar — AI gets the branded mark, user gets initials */}
      <span
        aria-hidden
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-full text-white shadow-soft-sm",
          isUser
            ? "bg-ink"
            : "bg-gradient-to-br from-brand-500 via-brand-700 to-brand-900 ring-2 ring-white",
        )}
      >
        {isUser ? (
          <span className="type-display text-[11px] font-bold">You</span>
        ) : (
          <Sparkles className="h-4 w-4 text-ochre-300" strokeWidth={2.4} />
        )}
      </span>

      <div
        className={cn(
          "flex max-w-[82%] flex-col gap-1.5",
          isUser ? "items-end" : "items-start",
        )}
      >
        {/* Bubble */}
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed transition-shadow",
            isUser
              ? "rounded-tr-sm bg-brand-700 text-white shadow-soft-sm"
              : "rounded-tl-sm border border-line bg-surface text-ink shadow-soft-sm",
          )}
        >
          {message.text}
        </div>

        {/* Inline action badge */}
        {message.action && !showActionPreview && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold",
              isUser
                ? "bg-brand-50 text-brand-700"
                : "bg-cool-100 text-brand-700 ring-1 ring-brand-100",
            )}
          >
            <span className="h-1 w-1 rounded-full bg-ochre-500" />
            → {describeActionType(message.action.type)}
          </span>
        )}

        {/* Confirmation preview card (ADD_TO_CART) */}
        {showActionPreview && message.action?.type === "ADD_TO_CART" && (
          <ActionPreviewCard
            action={message.action as AddToCartAction}
            onConfirm={onConfirm}
            onCancel={onCancel}
            busy={busy}
          />
        )}

        {/* Timestamp — subtle, only on hover */}
        <time className="px-1 text-[9px] text-ink-subtle opacity-0 transition-opacity group-hover/msg:opacity-100">
          {new Date(message.ts).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
      </div>
    </div>
  );
}
