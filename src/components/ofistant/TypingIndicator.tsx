// src/components/ofistant/TypingIndicator.tsx
// Subtle three-dot typing indicator with staggered animation.
export function TypingIndicator() {
  return (
    <div
      className="flex items-center gap-1 px-0.5"
      aria-label="Ofistant sedang mengetik"
    >
      <span className="sr-only">Ofistant sedang berpikir</span>
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400 [animation-delay:0ms] [animation-duration:900ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500 [animation-delay:150ms] [animation-duration:900ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-600 [animation-delay:300ms] [animation-duration:900ms]" />
    </div>
  );
}
