"use client";

// Preference is on by default. Playback readiness is separate: the first
// interaction unlocks Web Audio silently, without replaying old notifications.
const preferenceKey = "ofissio-chat-sound";
let context: AudioContext | null = null;
let enabled = true;
let unlocking: Promise<void> | null = null;
const listeners = new Set<() => void>();
export const subscribeChatSound = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const chatSoundEnabled = () => enabled;
export const chatSoundServerSnapshot = () => false;
function publish() { listeners.forEach((listener) => listener()); }

async function unlockAudio() {
  if (context?.state === "running") return;
  if (unlocking) return unlocking;
  context ??= new AudioContext();
  unlocking = context.resume().then(() => {
    if (context?.state !== "running") throw new Error("Suara belum diizinkan browser.");
  }).finally(() => { unlocking = null; });
  return unlocking;
}

if (typeof window !== "undefined") {
  try { enabled = localStorage.getItem(preferenceKey) !== "off"; } catch {}
  const unlockOnInteraction = () => {
    if (enabled) void unlockAudio().catch(() => { /* Retry on the next interaction. */ });
  };
  window.addEventListener("pointerdown", unlockOnInteraction, { passive: true });
  window.addEventListener("keydown", unlockOnInteraction);
  window.addEventListener("storage", (event) => {
    if (event.key === preferenceKey || event.key === null) {
      try { enabled = localStorage.getItem(preferenceKey) !== "off"; } catch {}
      publish();
    }
  });
}

export async function setChatSound(on: boolean) {
  enabled = on;
  try { localStorage.setItem(preferenceKey, on ? "on" : "off"); } catch {}
  publish();
  if (on) { await unlockAudio(); playChatSound(); }
}

export function playChatSound() {
  if (!enabled || !context || context.state !== "running") return;
  const now = context.currentTime;
  // Original three-note chime with a soft, bell-like envelope (Apple-inspired).
  [880, 1174.66, 1567.98].forEach((frequency, index) => {
    const tone = context!.createOscillator();
    const gain = context!.createGain();
    tone.type = "sine"; tone.frequency.value = frequency;
    const start = now + index * 0.115;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.09, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.48);
    tone.connect(gain); gain.connect(context!.destination);
    tone.start(start); tone.stop(start + 0.5);
  });
}
