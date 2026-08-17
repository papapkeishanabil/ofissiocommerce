import { NextResponse } from "next/server";
import { z } from "zod";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import {
  getPublicVapidKey,
  isAdminWebPushConfigured,
  removeAdminPushSubscription,
  saveAdminPushSubscription,
} from "@/features/admin-notifications/admin-push.service";
import { safeErrorResponse } from "@/lib/security/safe-error-response";

export const runtime = "nodejs";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2_000),
  keys: z.object({
    p256dh: z.string().min(1).max(1_000),
    auth: z.string().min(1).max(1_000),
  }),
});

export async function GET(request: Request) {
  try {
    requireInternalAdmin(request, "admin:notification:view");
    return NextResponse.json({
      ok: true,
      configured: isAdminWebPushConfigured(),
      publicKey: getPublicVapidKey(),
    });
  } catch (error) {
    return safeErrorResponse(error, "Konfigurasi push belum tersedia.", 403);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireInternalAdmin(request, "admin:notification:view");
    const subscription = subscriptionSchema.parse(await request.json());
    await saveAdminPushSubscription({
      userId: actor.id,
      role: actor.role,
      subscription,
      userAgent: request.headers.get("user-agent"),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeErrorResponse(error, "Notifikasi perangkat belum dapat diaktifkan.", 400);
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = requireInternalAdmin(request, "admin:notification:view");
    const payload = z.object({ endpoint: z.string().url().max(2_000) }).parse(await request.json());
    await removeAdminPushSubscription(payload.endpoint, actor.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeErrorResponse(error, "Notifikasi perangkat belum dapat dinonaktifkan.", 400);
  }
}
