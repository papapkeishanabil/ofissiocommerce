// src/lib/mock/storage.ts
// Thin localStorage wrapper. Centralised so the swap to a real backend
// (Prisma + API routes in later phases) touches only this module.

const PREFIX = "ofissio-mock:";

export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // quota / serialization — silent fail in mock layer.
  }
}

export function removeKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

export function genId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}

export function genCode(prefix: string): string {
  const n = Math.floor(Math.random() * 90000) + 10000;
  return `${prefix}-${n}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}
