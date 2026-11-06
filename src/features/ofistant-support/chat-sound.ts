"use client";

// The gesture unlocks Web Audio. Persist preference, but never claim audio is
// ready after a reload until the browser allows playback again.
let context: AudioContext | null = null;
let enabled = false;
const listeners = new Set<() => void>();
export const subscribeChatSound = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const chatSoundEnabled = () => enabled;
export const chatSoundServerSnapshot = () => false;
function publish() { listeners.forEach((listener) => listener()); }

export async function setChatSound(on: boolean) {
  if (on) {
    context ??= new AudioContext();
    await context.resume();
    if (context.state !== "running") throw new Error("Suara belum diizinkan browser. Tekan Aktifkan suara kembali.");
  }
  enabled = on;
  try { localStorage.setItem("ofissio-chat-sound", on ? "on" : "off"); } catch {}
  publish();
  if (on) playChatSound();
}

export function playChatSound() {
  if (!enabled || !context || context.state !== "running") return;
  const now = context.currentTime;
  [660, 880].forEach((frequency, index) => {
    const tone = context!.createOscillator();
    const gain = context!.createGain();
    tone.type = "sine"; tone.frequency.value = frequency;
    const start = now + index * 0.16;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.12, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
    tone.connect(gain); gain.connect(context!.destination);
    tone.start(start); tone.stop(start + 0.25);
  });
}
