// src/app/api/3d/meshy/create/route.ts
// Create a Meshy.ai image-to-3d task. Server-only — MESHY_API_KEY never
// crosses to the client. In mock mode (no key), returns a synthetic task.
//
// Two modes:
//   - single: { imageUrl }              → image-to-3d
//   - multi:  { imageUrls: string[] }   → multi-image-to-3d (1–4 images → 1 GLB)

import { NextResponse } from "next/server";

import {
  createImageTo3D,
  createMultiImageTo3D,
} from "@/lib/meshy/meshy-service";

export const runtime = "nodejs";

interface CreateBody {
  imageUrl?: string;
  imageUrls?: string[];
  prompt?: string;
}

export async function POST(req: Request) {
  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid JSON" }, { status: 400 });
  }

  // Multi-image path (1–4 images → 1 GLB)
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

  // Single-image path
  if (!body.imageUrl || typeof body.imageUrl !== "string") {
    return NextResponse.json(
      { ok: false, reason: "imageUrl atau imageUrls wajib diisi" },
      { status: 400 },
    );
  }

  const result = await createImageTo3D({ imageUrl: body.imageUrl, prompt: body.prompt });
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 502 });
  }
  return NextResponse.json(result);
}
