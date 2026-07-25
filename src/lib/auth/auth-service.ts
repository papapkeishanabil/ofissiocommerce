// src/lib/auth/auth-service.ts
// Mock auth service. API surface mirrors what NextAuth + Prisma will offer
// in later phases, so component code doesn't change on migration.
//
// SECURITY NOTE: passwords are hashed with a weak mock hash for MVP only.
// DO NOT use in production — Phase 6 will replace with bcrypt + server session.

import type {
  AuthSession,
  Company,
  CompanyRole,
  User,
} from "@/types/account";
import { isCompanyProfileComplete } from "@/types/account";
import { readJSON, writeJSON, removeKey, genId, nowISO } from "@/lib/mock/storage";

interface StoredUser extends User {
  /** mock-hashed password — never log */
  passwordHash: string;
}

interface MockDB {
  users: StoredUser[];
  companies: Company[];
}

const DB_KEY = "db";
const SESSION_KEY = "session";

/**
 * Weak mock hash. Replace with bcrypt server-side in Phase 6.
 * Sufficient only to avoid storing raw plaintext in localStorage.
 */
function mockHash(pw: string): string {
  // Simple salted FNV-1a-ish — NOT cryptographically secure.
  let h = 0x811c9dc5;
  const salt = "ofissio-mock-salt";
  const s = salt + pw;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function loadDB(): MockDB {
  return readJSON<MockDB>(DB_KEY, { users: [], companies: [] });
}

function saveDB(db: MockDB): void {
  writeJSON(DB_KEY, db);
}

export interface RegisterInput {
  fullName: string;
  email: string;
  whatsapp: string;
  password: string;
}

export interface RegisterResult {
  ok: boolean;
  reason?: string;
  session?: AuthSession;
}

export function register(input: RegisterInput): RegisterResult {
  const db = loadDB();
  const email = input.email.trim().toLowerCase();

  if (db.users.some((u) => u.email === email)) {
    return { ok: false, reason: "Email sudah terdaftar. Silakan login." };
  }

  // First user → company_admin (per spec).
  // NOTE: real "first user of a company" logic comes in Phase 6; for MVP the
  // first registration in this browser becomes admin of a fresh company.
  const role: CompanyRole =
    db.users.length === 0 ? "company_admin" : "viewer";

  const companyId = genId("co");
  const userId = genId("usr");
  const now = nowISO();

  const company: Company = {
    id: companyId,
    companyName: "", // filled in profile step
    industry: "",
    employeeCount: 0,
    npwp: null,
    phone: "",
    picName: input.fullName,
    picEmail: email,
    picWhatsapp: input.whatsapp,
    profileCompletedAt: null,
    addresses: [],
    createdAt: now,
    updatedAt: now,
  };

  const user: StoredUser = {
    id: userId,
    companyId,
    fullName: input.fullName.trim(),
    email,
    whatsapp: input.whatsapp.trim(),
    role,
    status: "active",
    passwordHash: mockHash(input.password),
    createdAt: now,
    updatedAt: now,
  };

  db.companies.push(company);
  db.users.push(user);
  saveDB(db);

  const session: AuthSession = { user: stripHash(user), company };
  writeJSON(SESSION_KEY, session);
  return { ok: true, session };
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  ok: boolean;
  reason?: string;
  session?: AuthSession;
}

export function login(input: LoginInput): LoginResult {
  const db = loadDB();
  const email = input.email.trim().toLowerCase();
  const user = db.users.find((u) => u.email === email);
  if (!user) {
    return { ok: false, reason: "Email atau password salah." };
  }
  if (user.passwordHash !== mockHash(input.password)) {
    return { ok: false, reason: "Email atau password salah." };
  }
  if (user.status !== "active") {
    return { ok: false, reason: "Akun dinonaktifkan. Hubungi admin." };
  }
  const company = db.companies.find((c) => c.id === user.companyId);
  if (!company) {
    return { ok: false, reason: "Data perusahaan tidak ditemukan." };
  }
  const session: AuthSession = { user: stripHash(user), company };
  writeJSON(SESSION_KEY, session);
  return { ok: true, session };
}

export function logout(): void {
  removeKey(SESSION_KEY);
}

export function getSession(): AuthSession | null {
  return readJSON<AuthSession | null>(SESSION_KEY, null);
}

export function refreshSession(): AuthSession | null {
  const s = getSession();
  if (!s) return null;
  const db = loadDB();
  const user = db.users.find((u) => u.id === s.user.id);
  const company = db.companies.find((c) => c.id === s.user.companyId);
  if (!user || !company) {
    logout();
    return null;
  }
  const fresh: AuthSession = { user: stripHash(user), company };
  writeJSON(SESSION_KEY, fresh);
  return fresh;
}

export function updateCompany(
  companyId: string,
  patch: Partial<Company>,
): AuthSession | null {
  const db = loadDB();
  const idx = db.companies.findIndex((c) => c.id === companyId);
  if (idx < 0) return null;
  const before = db.companies[idx]!;
  const wasIncomplete = !isCompanyProfileComplete(before);
  const next: Company = {
    ...before,
    ...patch,
    addresses: patch.addresses ?? before.addresses,
    updatedAt: nowISO(),
  };
  if (wasIncomplete && isCompanyProfileComplete(next)) {
    next.profileCompletedAt = nowISO();
  }
  db.companies[idx] = next;
  saveDB(db);
  return refreshSession();
}

export function addAddress(
  companyId: string,
  address: Company["addresses"][number],
): AuthSession | null {
  const db = loadDB();
  const company = db.companies.find((c) => c.id === companyId);
  if (!company) return null;

  // Enforce single default per type.
  if (address.isDefaultShipping) {
    company.addresses.forEach((a) => (a.isDefaultShipping = false));
  }
  if (address.isDefaultBilling) {
    company.addresses.forEach((a) => (a.isDefaultBilling = false));
  }
  // First address auto-becomes default shipping + billing.
  if (company.addresses.length === 0) {
    address.isDefaultShipping = true;
    address.isDefaultBilling = true;
  }
  company.addresses.push(address);
  company.updatedAt = nowISO();
  saveDB(db);
  return refreshSession();
}

export function removeAddress(
  companyId: string,
  addressId: string,
): AuthSession | null {
  const db = loadDB();
  const company = db.companies.find((c) => c.id === companyId);
  if (!company) return null;
  company.addresses = company.addresses.filter((a) => a.id !== addressId);
  // Re-elect defaults if needed.
  if (!company.addresses.some((a) => a.isDefaultShipping) && company.addresses[0]) {
    company.addresses[0]!.isDefaultShipping = true;
  }
  if (!company.addresses.some((a) => a.isDefaultBilling) && company.addresses[0]) {
    company.addresses[0]!.isDefaultBilling = true;
  }
  company.updatedAt = nowISO();
  saveDB(db);
  return refreshSession();
}

function stripHash(u: StoredUser): User {
  const { passwordHash: _omit, ...rest } = u;
  return rest;
}

// ===== Auth guards (placeholders — real ones run server-side in Phase 6) =====

export function requireAuth(): AuthSession | null {
  return refreshSession();
}

export function requireCompanyAccess(
  session: AuthSession | null,
  companyId: string,
): boolean {
  if (!session) return false;
  return session.user.companyId === companyId;
}
