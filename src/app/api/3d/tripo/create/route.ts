// src/app/api/3d/tripo/create/route.ts
import { NextResponse } from "next/server";
import { createTripoTask } from "@/lib/tripo/tripo-service";

export const runtime = "nodejs";

interface CreateBody {
  imagePath?: string;
}

export async function POST(req: Request) {
  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid JSON" }, { status: 400 });
  }
  if (!body.imagePath) {
    return NextResponse.json({ ok: false, reason: "imagePath wajib diisi" }, { status: 400 });
  }

  const result = await createTripoTask(body.imagePath);
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 502 });
  }
  return NextResponse.json(result);
}
