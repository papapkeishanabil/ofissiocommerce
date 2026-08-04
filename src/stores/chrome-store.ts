"use client";

import { create } from "zustand";

let railTimer: ReturnType<typeof setTimeout> | null = null;
let topTimer: ReturnType<typeof setTimeout> | null = null;

function clearTimers() {
  if (railTimer) { clearTimeout(railTimer); railTimer = null; }
  if (topTimer) { clearTimeout(topTimer); topTimer = null; }
}

interface ChromeState {
  railHovered: boolean;
  topHovered: boolean;
  pinned: boolean;
  locked: boolean;
  railEnter: () => void;
  railLeave: () => void;
  topEnter: () => void;
  topLeave: () => void;
  togglePin: () => void;
  openChrome: () => void;
  setLocked: (value: boolean) => void;
}

export const useChromeStore = create<ChromeState>((set, get) => ({
  railHovered: false,
  topHovered: false,
  pinned: false,
  locked: false,
  railEnter: () => { if (railTimer) { clearTimeout(railTimer); railTimer = null; } set({ railHovered: true }); },
  railLeave: () => { if (railTimer) clearTimeout(railTimer); railTimer = setTimeout(() => set({ railHovered: false }), 220); },
  topEnter: () => { if (topTimer) { clearTimeout(topTimer); topTimer = null; } set({ topHovered: true }); },
  topLeave: () => { if (topTimer) clearTimeout(topTimer); topTimer = setTimeout(() => set({ topHovered: false }), 220); },
  togglePin: () => {
    const willPin = !get().pinned;
    if (willPin) { clearTimers(); set({ pinned: true, railHovered: true, topHovered: true }); }
    else { set({ pinned: false }); }
  },
  openChrome: () => { clearTimers(); set({ pinned: true, railHovered: true, topHovered: true }); },
  setLocked: (value) => {
    if (value) { clearTimers(); set({ locked: true, railHovered: true, topHovered: true }); }
    else { clearTimers(); set({ locked: false, pinned: false, railHovered: false, topHovered: false }); }
  },
}));

export const useChromeOpen = () =>
  useChromeStore((s) => s.railHovered || s.topHovered || s.pinned || s.locked);
