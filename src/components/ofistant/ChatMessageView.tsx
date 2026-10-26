"use client";

import type { ChatMessage } from "@/lib/ofistant/ofistant.types";
import { describeActionType } from "@/lib/ofistant/ofistant.actions";
import { cn } from "@/lib/utils";
import { OfistantMark } from "./OfistantMark";
import styles from "./OfistantChat.module.css";

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
    <div className={cn(styles.message, isUser && styles.userMessage)}>
      {/* Avatar */}
      {!isUser && <span aria-hidden className={styles.avatar}><OfistantMark variant="rev" /></span>}

      <div className={styles.messageBody}>
        {/* Bubble */}
        <div className={cn(styles.bubble, isUser && styles.userBubble)}>
          {isUser ? message.text : <AssistantMessageText text={message.text} />}
        </div>

        {/* Timestamp */}
        <span className={styles.time}>
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
