// src/app/api/3d/meshy/poll/route.ts
// Poll a Meshy.ai task status. Server-only.

import { NextResponse } from "next/server";

import { pollImageTo3D } from "@/lib/meshy/meshy-service";

export const runtime = "nodejs";

interface PollQuery {
  taskId?: string;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const taskId = url.searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json({ ok: false, reason: "taskId wajib diisi" }, { status: 400 });
  }

  const result = await pollImageTo3D(taskId);
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 502 });
  }
  return NextResponse.json(result);
}
