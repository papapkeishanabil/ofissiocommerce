"use client";
import { ChatAttachmentView } from "./ChatAttachmentView";
import { Headset } from "lucide-react";
import type { SupportMessage } from "./support.types";
import styles from "@/components/ofistant/OfistantChat.module.css";
export function SupportMessageView({ message, conversationId }: { message: SupportMessage; conversationId: string }) {
  if (message.role === "system") return <p className={styles.supportEvent}>{message.text}</p>;
  return <div className={`${styles.message} ${message.role === "user" ? styles.userMessage : ""}`}>
    {message.role === "staff" && <span className={`${styles.avatar} ${styles.staffAvatar}`} aria-hidden="true"><Headset size={18} /></span>}
    <div className={`${styles.messageBody} ${styles.supportMessage}`}>
      <span className={styles.supportSender}>{message.role === "staff" ? `${message.name} · Tim Ofissio` : message.role === "assistant" ? "Ofistant AI" : message.name}</span>
      <div className={`${styles.bubble} ${message.role === "user" ? styles.userBubble : ""}`}>{message.attachment && message.role === "staff" ? <ChatAttachmentView card={message.attachment} conversationId={conversationId} /> : message.text}</div>
      <time className={styles.time} dateTime={new Date(message.ts).toISOString()}>{new Date(message.ts).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</time>
    </div>
  </div>;
}
