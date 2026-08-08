import "server-only";

import { randomUUID } from "node:crypto";

import { repositoryRegistry } from "@/features/repositories/repository.factory";

import { getClientIp } from "./rate-limit";
import type { AuditActorType, AuditEvent } from "./security.types";

interface AuditState {
  events: AuditEvent[];
}

type AuditGlobal = typeof globalThis & {
  __ofissioAuditState?: AuditState;
};

const auditGlobal = globalThis as AuditGlobal;
const state =
  auditGlobal.__ofissioAuditState ??
  (auditGlobal.__ofissioAuditState = { events: [] });

const MAX_EVENTS = 500;

export function logAuditEvent(input: {
  request?: Request;
  actorId?: string | null;
  actorType?: AuditActorType;
  companyId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const safeMetadata = sanitizeMetadata(input.metadata ?? {});
  const event: AuditEvent = {
    id: `aud_${randomUUID()}`,
    actorId: input.actorId ?? null,
    actorType: input.actorType ?? "system",
    companyId: input.companyId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    metadata: safeMetadata,
    ipAddress: input.request ? getClientIp(input.request) : null,
    userAgent: input.request?.headers.get("user-agent") ?? null,
    createdAt: new Date().toISOString(),
  };

  state.events.unshift(event);
  state.events = state.events.slice(0, MAX_EVENTS);
  void repositoryRegistry.auditLogs.writeAuditLog(event).catch(() => {
    // Audit persistence must never break the user flow.
  });

  if (process.env.NODE_ENV !== "production") {
    console.info("[audit]", {
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      companyId: event.companyId,
    });
  }

  return event;
}

export function logSecurityEvent(input: Omit<Parameters<typeof logAuditEvent>[0], "actorType">) {
  return logAuditEvent({ ...input, actorType: "system" });
}

export function logPaymentEvent(input: Omit<Parameters<typeof logAuditEvent>[0], "entityType">) {
  return logAuditEvent({ ...input, entityType: "payment" });
}

export function logUploadEvent(input: Omit<Parameters<typeof logAuditEvent>[0], "entityType">) {
  return logAuditEvent({ ...input, entityType: "upload" });
}

export function logAdminEvent(input: Omit<Parameters<typeof logAuditEvent>[0], "actorType">) {
  return logAuditEvent({ ...input, actorType: "internal" });
}

export function listAuditEvents() {
  return [...state.events];
}

const BLOCKED_AUDIT_KEY = /(?:api[_-]?key|secret|token|password|passphrase|signature|authorization|cookie|raw(?:provider)?(?:response|payload)|requestbody|responsebody)/i;
const MAX_AUDIT_DEPTH = 4;
const MAX_AUDIT_ARRAY_ITEMS = 25;
const MAX_AUDIT_STRING_LENGTH = 240;

function sanitizeMetadata(metadata: Record<string, unknown>) {
  return sanitizeRecord(metadata, 0);
}

function sanitizeRecord(value: Record<string, unknown>, depth: number) {
  if (depth >= MAX_AUDIT_DEPTH) return { truncated: true };
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !BLOCKED_AUDIT_KEY.test(key))
      .map(([key, item]) => [key, sanitizeAuditValue(item, depth + 1)]),
  );
}

function sanitizeAuditValue(value: unknown, depth: number): unknown {
  if (typeof value === "string") {
    return value.length > MAX_AUDIT_STRING_LENGTH
      ? `${value.slice(0, MAX_AUDIT_STRING_LENGTH)}...`
      : value;
  }
  if (Array.isArray(value)) {
    if (depth >= MAX_AUDIT_DEPTH) return ["[truncated]"];
    return value
      .slice(0, MAX_AUDIT_ARRAY_ITEMS)
      .map((item) => sanitizeAuditValue(item, depth + 1));
  }
  if (value && typeof value === "object") {
    return sanitizeRecord(value as Record<string, unknown>, depth);
  }
  return value;
}
