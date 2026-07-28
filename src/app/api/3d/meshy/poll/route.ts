// src/app/api/3d/meshy/poll/route.ts
// Poll a Meshy.ai task status. Server-only.

import { NextResponse } from "next/server";
import { z } from "zod";

import { pollImageTo3D } from "@/lib/meshy/meshy-service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { parseQueryParams } from "@/lib/security/validate-input";

export const runtime = "nodejs";

const pollQuerySchema = z.object({
  taskId: z.string().trim().min(1).max(200),
});

export async function GET(req: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(req, "3d.meshy.poll"),
      limit: 60,
      windowMs: 60_000,
    });
    const { taskId } = parseQueryParams(pollQuerySchema, req);

    const result = await pollImageTo3D(taskId);
    if (!result.ok) {
      return NextResponse.json({ ok: false, reason: result.reason }, { status: 502 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return safeErrorResponse(error, "Status task 3D belum tersedia.", 400);
  }
}
