import { z } from "zod";

import {
  PROCESS_ORDER_PRIORITIES,
  PROCESS_ORDER_ROUTES,
  PROCESS_ORDER_STATUSES,
  PROCESS_REPLENISHMENT_STATUSES,
} from "./process-order.config";

export const processOrderIdParamSchema = z.object({
  id: z.string().trim().min(1).max(180),
});

export const processOrderTaskIdParamSchema = z.object({
  id: z.string().trim().min(1).max(180),
  taskId: z.string().trim().min(1).max(180),
});

export const processOrderListQuerySchema = z.object({
  companyId: z.string().trim().min(1).max(180).optional(),
  processRoute: z.enum(PROCESS_ORDER_ROUTES).optional(),
  processStatus: z.enum(PROCESS_ORDER_STATUSES).optional(),
});

export const processOrderPatchSchema = z
  .object({
    processStatus: z.enum(PROCESS_ORDER_STATUSES).optional(),
    replenishmentStatus: z.enum(PROCESS_REPLENISHMENT_STATUSES).optional(),
    currentStage: z.string().trim().min(1).max(120).optional(),
    priority: z.enum(PROCESS_ORDER_PRIORITIES).optional(),
    deadline: z.string().trim().max(120).nullable().optional(),
    assignedTeam: z.string().trim().max(120).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "Patch tidak boleh kosong.",
  });

export const completeProcessTaskSchema = z.object({
  notes: z.string().trim().max(1000).nullable().optional(),
});

export const processOrderEventSchema = z.object({
  eventType: z
    .enum([
      "created",
      "status_updated",
      "stage_updated",
      "task_completed",
      "replenishment_updated",
      "note_added",
      "event_added",
    ])
    .default("event_added"),
  note: z.string().trim().min(1).max(1000),
  metadata: z.record(z.unknown()).optional(),
});

export type ProcessOrderPatchPayload = z.infer<typeof processOrderPatchSchema>;
export type ProcessOrderEventPayload = z.infer<typeof processOrderEventSchema>;
