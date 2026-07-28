// src/app/api/3d/meshy/create/route.ts
// Create a Meshy.ai image-to-3d task. Server-only: MESHY_API_KEY never
// crosses to the client. In mock mode (no key), returns a synthetic task.

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createImageTo3D,
  createMultiImageTo3D,
} from "@/lib/meshy/meshy-service";
import { createRateLimitKey, rateLimitOrThrow } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/safe-error-response";
import { validateInput } from "@/lib/security/validate-input";

export const runtime = "nodejs";

const createBodySchema = z.object({
  imageUrl: safeImageReferenceSchema().optional(),
  imageUrls: z.array(safeImageReferenceSchema()).min(1).max(4).optional(),
  prompt: z.string().trim().max(800).optional(),
});

export async function POST(req: Request) {
  try {
    rateLimitOrThrow({
      key: createRateLimitKey(req, "3d.meshy.create"),
      limit: 10,
      windowMs: 60_000,
    });
    const body = validateInput(createBodySchema, await req.json());

    if (Array.isArray(body.imageUrls) && body.imageUrls.length > 0) {
      const result = await createMultiImageTo3D({
        imageUrls: body.imageUrls,
        prompt: body.prompt,
      });
      if (!result.ok) {
        return NextResponse.json({ ok: false, reason: result.reason }, { status: 502 });
      }
      return NextResponse.json(result);
    }

    if (!body.imageUrl) {
      return NextResponse.json(
        { ok: false, reason: "imageUrl atau imageUrls wajib diisi" },
        { status: 400 },
      );
    }

    const result = await createImageTo3D({
      imageUrl: body.imageUrl,
      prompt: body.prompt,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, reason: result.reason }, { status: 502 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return safeErrorResponse(error, "Permintaan generate 3D belum valid.", 400);
  }
}

function safeImageReferenceSchema() {
  return z
    .string()
    .trim()
    .min(1)
    .max(400)
    .refine(
      (value) =>
        value.startsWith("/") ||
        value.startsWith("https://") ||
        (process.env.NODE_ENV !== "production" && value.startsWith("http://")),
      "Image reference tidak valid.",
    );
}
