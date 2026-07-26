// src/app/api/3d/tripo/poll/route.ts
import { NextResponse } from "next/server";
import { pollTripoTask } from "@/lib/tripo/tripo-service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const taskId = url.searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json({ ok: false, reason: "taskId wajib diisi" }, { status: 400 });
  }

  const result = await pollTripoTask(taskId);
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 502 });
  }
  return NextResponse.json(result);
}
