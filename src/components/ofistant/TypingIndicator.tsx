// src/components/ofistant/TypingIndicator.tsx
export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-1" aria-label="Ofistant sedang mengetik">
      <span className="sr-only">Ofistant sedang mengetik</span>
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted [animation-delay:300ms]" />
    </div>
  );
}
