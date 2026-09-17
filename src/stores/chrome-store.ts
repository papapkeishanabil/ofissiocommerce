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
  railPinned: boolean;
  topHovered: boolean;
  pinned: boolean;
  locked: boolean;
  railEnter: () => void;
  railLeave: () => void;
  topEnter: () => void;
  topLeave: () => void;
  toggleRailPin: () => void;
  togglePin: () => void;
  openChrome: () => void;
  setLocked: (value: boolean) => void;
}

// Panel Ofistant dan bilah atas punya state terbuka terpisah: panel hanya
// mengikuti hover logo rail + pin eksplisit, bilah atas mengikuti hover strip
// atas + pin + kunci rute (navigasi halaman dalam). Mengarahkan pointer ke
// logo Ofistant membuka panel di halaman mana pun — tanpa menyeret bilah atas.
export const useChromeStore = create<ChromeState>((set, get) => ({
  railHovered: false,
  railPinned: false,
  topHovered: false,
  pinned: false,
  locked: false,
  railEnter: () => { if (railTimer) { clearTimeout(railTimer); railTimer = null; } set({ railHovered: true }); },
  railLeave: () => { if (railTimer) clearTimeout(railTimer); railTimer = setTimeout(() => set({ railHovered: false }), 220); },
  topEnter: () => { if (topTimer) { clearTimeout(topTimer); topTimer = null; } set({ topHovered: true }); },
  topLeave: () => { if (topTimer) clearTimeout(topTimer); topTimer = setTimeout(() => set({ topHovered: false }), 220); },
  toggleRailPin: () => {
    const willPin = !get().railPinned;
    if (willPin) { if (railTimer) { clearTimeout(railTimer); railTimer = null; } set({ railPinned: true }); }
    else { set({ railPinned: false }); }
  },
  togglePin: () => {
    const willPin = !get().pinned;
    if (willPin) { if (topTimer) { clearTimeout(topTimer); topTimer = null; } set({ pinned: true }); }
    else { set({ pinned: false }); }
  },
  openChrome: () => { if (railTimer) { clearTimeout(railTimer); railTimer = null; } set({ railPinned: true, railHovered: true }); },
  setLocked: (value) => {
    if (value) { if (topTimer) { clearTimeout(topTimer); topTimer = null; } set({ locked: true, topHovered: true }); }
    else { clearTimers(); set({ locked: false, pinned: false, topHovered: false }); }
  },
}));

export const useRailOpen = () =>
  useChromeStore((s) => s.railHovered || s.railPinned);

export const useTopOpen = () =>
  useChromeStore((s) => s.topHovered || s.pinned || s.locked);

// Kompatibilitas untuk efek global (mis. kelas body scrollbar): bagian mana
// pun dari chrome yang terbuka.
export const useChromeOpen = () =>
  useChromeStore((s) => s.railHovered || s.railPinned || s.topHovered || s.pinned || s.locked);
