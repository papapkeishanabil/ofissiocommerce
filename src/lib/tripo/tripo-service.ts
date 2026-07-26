// src/lib/tripo/tripo-service.ts
// Server-side wrapper for Tripo3D API. Two-step flow:
//   1. Upload image (multipart) → get image_token
//   2. Create image-to-model task → get task_id
//   3. Poll task → GLB URL
//
// API ref: https://platform.tripo3d.ai/docs
// Never expose TRIPO_API_KEY to the client.

import { readFileSync } from "node:fs";
import { resolve, basename } from "node:path";

const TRIPO_BASE = "https://openapi.tripo3d.ai/v3";

export function isTripoConfigured(): boolean {
  return !!process.env.TRIPO_API_KEY;
}

export interface TripoTask {
  id: string;
  status: "queued" | "running" | "success" | "failed" | "cancelled";
  progress?: number;
  modelUrl?: string;
  error?: string;
}

/** Step 1: Upload a local /public image file to Tripo, get image_token. */
async function uploadFile(publicPath: string): Promise<{ ok: true; token: string } | { ok: false; reason: string }> {
  const apiKey = process.env.TRIPO_API_KEY!;
  const fsPath = resolve(process.cwd(), "public", publicPath.replace(/^\//, ""));
  const fileBuffer = readFileSync(fsPath);
  const fileName = basename(fsPath);
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "png";
  const mime = ext === "webp" ? "image/webp" : ext === "jpg" ? "image/jpeg" : "image/png";

  const formData = new FormData();
  formData.append("file", new Blob([fileBuffer], { type: mime }), fileName);

  try {
    const res = await fetch(`${TRIPO_BASE}/files`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, reason: `Tripo upload error ${res.status}: ${text.slice(0, 200)}` };
    }
    const data = (await res.json()) as { code: number; data?: { image_token?: string; file_token?: string } };
    const token = data.data?.image_token ?? data.data?.file_token;
    if (!token) {
      return { ok: false, reason: "Tripo upload: no token in response." };
    }
    return { ok: true, token };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "Network error" };
  }
}

/** Step 2: Create image-to-model task from uploaded file token. */
export async function createTripoTask(
  publicImagePath: string,
): Promise<{ ok: true; task: TripoTask } | { ok: false; reason: string }> {
  const apiKey = process.env.TRIPO_API_KEY;
  if (!apiKey) {
    return { ok: false, reason: "TRIPO_API_KEY belum dikonfigurasi." };
  }

  // 1. Upload
  const upload = await uploadFile(publicImagePath);
  if (!upload.ok) return upload;

  // 2. Create generation task
  try {
    const res = await fetch(`${TRIPO_BASE}/generation`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file: {
          type: ext === "webp" ? "webp" : ext === "jpg" ? "jpg" : "png",
          file_token: upload.token,
        },
        model: "v3.1-20260211",
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, reason: `Tripo generation error ${res.status}: ${text.slice(0, 200)}` };
    }
    const data = (await res.json()) as { code: number; data?: { task_id?: string } };
    const taskId = data.data?.task_id;
    if (!taskId) {
      return { ok: false, reason: "Tripo: no task_id in response." };
    }
    return { ok: true, task: { id: taskId, status: "queued" } };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "Network error" };
  }
}

/** Step 3: Poll task status. */
export async function pollTripoTask(
  taskId: string,
): Promise<{ ok: true; task: TripoTask } | { ok: false; reason: string }> {
  const apiKey = process.env.TRIPO_API_KEY;
  if (!apiKey) {
    return { ok: false, reason: "TRIPO_API_KEY belum dikonfigurasi." };
  }

  try {
    const res = await fetch(`${TRIPO_BASE}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      return { ok: false, reason: `Tripo poll error ${res.status}` };
    }
    const data = (await res.json()) as {
      code: number;
      data?: {
        status?: string;
        progress?: number;
        output?: { model?: string; model_url?: string };
        task?: { status?: string; progress?: number; output?: { model?: string; model_url?: string } };
      };
    };
    const d = data.data?.task ?? data.data ?? {};
    const status = (d.status ?? "running") as TripoTask["status"];
    const modelUrl = d.output?.model_url ?? d.output?.model;
    return {
      ok: true,
      task: {
        id: taskId,
        status,
        progress: d.progress,
        modelUrl,
      },
    };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "Network error" };
  }
}
