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

function sanitizeMetadata(metadata: Record<string, unknown>) {
  const blocked = /(api[_-]?key|secret|token|password|signature|authorization|rawProviderResponse)/i;
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !blocked.test(key))
      .map(([key, value]) => [
        key,
        typeof value === "string" && value.length > 240
          ? `${value.slice(0, 240)}...`
          : value,
      ]),
  );
}
