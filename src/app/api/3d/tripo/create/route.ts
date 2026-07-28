// src/app/api/3d/tripo/create/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";

import { createTripoTask } from "@/lib/tripo/tripo-service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

const createBodySchema = z.object({
  imagePath: z.string().trim().min(1).max(300),
});

export async function POST(req: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(req, "3d.tripo.create"),
      limit: 10,
      windowMs: 60_000,
    });
    const body = validateInput(createBodySchema, await req.json());

    const result = await createTripoTask(body.imagePath);
    if (!result.ok) {
      return NextResponse.json({ ok: false, reason: result.reason }, { status: 502 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return safeErrorResponse(error, "Permintaan generate 3D belum valid.", 400);
  }
}
