// src/components/ofistant/QuickReplies.tsx
// Suggestion chips that look like AI-suggested next actions, not generic
// buttons. Subtle fill + arrow affordance on hover.

import styles from "./OfistantChat.module.css";

interface QuickRepliesProps {
  options: string[];
  onPick: (text: string) => void;
  disabled?: boolean;
}

export function QuickReplies({ options, onPick, disabled }: QuickRepliesProps) {
  if (options.length === 0) return null;
  return (
    <div className={styles.quickReplies}>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          disabled={disabled}
          onClick={() => onPick(opt)}
          className={styles.quickReply}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
