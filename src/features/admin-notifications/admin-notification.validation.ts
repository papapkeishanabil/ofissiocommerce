import { z } from "zod";

import {
  ADMIN_NOTIFICATION_STATUSES,
  ADMIN_NOTIFICATION_TYPES,
} from "./admin-notification.types";

export const adminNotificationListQuerySchema = z.object({
  status: z.enum(ADMIN_NOTIFICATION_STATUSES).optional(),
  type: z.enum(ADMIN_NOTIFICATION_TYPES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().trim().max(100).optional(),
});

export const adminNotificationIdSchema = z.object({
  id: z.string().trim().min(1).max(160),
});
