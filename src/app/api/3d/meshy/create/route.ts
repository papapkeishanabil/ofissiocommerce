// src/app/api/3d/meshy/create/route.ts
// Create a Meshy.ai image-to-3d task. Server-only — MESHY_API_KEY never
// crosses to the client. In mock mode (no key), returns a synthetic task.

import { NextResponse } from "next/server";

import { createImageTo3D } from "@/lib/meshy/meshy-service";

export const runtime = "nodejs";

interface CreateBody {
  imageUrl?: string;
  prompt?: string;
}

export async function POST(req: Request) {
  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid JSON" }, { status: 400 });
  }
  if (!body.imageUrl || typeof body.imageUrl !== "string") {
    return NextResponse.json(
      { ok: false, reason: "imageUrl wajib diisi (URL publik)" },
      { status: 400 },
    );
  }

  const result = await createImageTo3D({ imageUrl: body.imageUrl, prompt: body.prompt });
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 502 });
  }
  return NextResponse.json(result);
}
