// src/lib/meshy/meshy-service.ts
// Server-side wrapper for the Meshy.ai image-to-3d API.
//
// Never expose MESHY_API_KEY to the client — this module is imported only by
// Next.js Route Handlers (/api/3d/meshy/*). When no key is configured, the
// service enters MOCK mode so the UI flow stays demoable.
//
// API reference: https://docs.meshy.ai/en/api/multi-image-to-3d
//   POST https://api.meshy.ai/openapi/v1/multi-image-to-3d   → create task
//   GET  https://api.meshy.ai/openapi/v1/multi-image-to-3d/{id} → poll

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const MESHY_BASE = "https://api.meshy.ai";

/**
 * Read a public/ file from disk and convert to a base64 data URI so Meshy
 * can ingest it without needing to fetch a public URL (which our localhost
 * dev server can't provide). Format: data:image/webp;base64,xxxx
 */
function publicFileToDataUri(publicPath: string): string {
  // publicPath like "/products/kk-006/KK-006-front-nobg.webp"
  const fsPath = resolve(process.cwd(), "public", publicPath.replace(/^\//, ""));
  const buf = readFileSync(fsPath);
  const ext = publicPath.split(".").pop()?.toLowerCase() ?? "png";
  const mime = ext === "webp" ? "image/webp" : ext === "jpg" ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export function isMeshyConfigured(): boolean {
  return !!process.env.MESHY_API_KEY;
}

export interface MeshyCreateInput {
  /** public URL the Meshy server can fetch */
  imageUrl: string;
  /** optional prompt hint to guide generation */
  prompt?: string;
  /** "meshy-4" | "meshy-5" | "meshy-6" — default meshy-5 (good balance) */
  aiModel?: string;
  /** enable PBR textures for realism */
  enablePbr?: boolean;
  /** art optimize the mesh */
  shouldRemesh?: boolean;
}

export interface MeshyTask {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED" | "CANCELED" | "IN_QUEUE";
  /** present when SUCCEEDED */
  modelUrls?: {
    glb?: string;
    fbx?: string;
    obj?: string;
    usdz?: string;
    stl?: string;
  };
  /** progress 0..100 (when IN_PROGRESS) */
  progress?: number;
  /** error message when FAILED */
  error?: string;
  /** timestamps (ms since epoch) */
  startTime?: number;
}

/** Create a new image-to-3d task. Returns the task id immediately. */
export async function createImageTo3D(
  input: MeshyCreateInput,
): Promise<{ ok: true; task: MeshyTask } | { ok: false; reason: string }> {
  const apiKey = process.env.MESHY_API_KEY;
  if (!apiKey) {
    // MOCK: return a synthetic task so the UI is demoable without key.
    return {
      ok: true,
      task: mockTask(input),
    };
  }

  try {
    const res = await fetch(`${MESHY_BASE}/openapi/v1/image-to-3d`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: input.imageUrl,
        prompt: input.prompt,
        ai_model: input.aiModel ?? "meshy-6",
        enable_pbr: input.enablePbr ?? true,
        should_texture: true,
        target_formats: ["glb"],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, reason: `Meshy error ${res.status}: ${text.slice(0, 200)}` };
    }
    const data = (await res.json()) as { result?: string; status?: string };
    return {
      ok: true,
      task: {
        id: data.result ?? crypto.randomUUID(),
        status: "IN_QUEUE",
        startTime: Date.now(),
      },
    };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "Network error" };
  }
}

export interface MeshyMultiImageInput {
  /** 1–4 image paths. Can be public URLs OR local /public paths (auto-converted
   *  to data URIs so Meshy can ingest without public hosting). */
  imageUrls: string[];
  prompt?: string;
  aiModel?: string;
  enablePbr?: boolean;
  shouldRemesh?: boolean;
}

/**
 * Multi-Image to 3D — accepts 1–4 images and generates ONE solid GLB mesh.
 * Local /public paths are auto-encoded as base64 data URIs.
 *
 * Docs: https://docs.meshy.ai/en/api/multi-image-to-3d
 * Endpoint: POST https://api.meshy.ai/openapi/v1/multi-image-to-3d
 */
export async function createMultiImageTo3D(
  input: MeshyMultiImageInput,
): Promise<{ ok: true; task: MeshyTask } | { ok: false; reason: string }> {
  const apiKey = process.env.MESHY_API_KEY;
  if (!apiKey) {
    return { ok: true, task: mockTask({ imageUrl: input.imageUrls[0] ?? "" }) };
  }

  if (input.imageUrls.length === 0 || input.imageUrls.length > 4) {
    return { ok: false, reason: "Jumlah gambar harus 1–4." };
  }

  // Convert local /public paths to data URIs; pass URLs through as-is.
  const imageData = input.imageUrls.map((p) =>
    p.startsWith("/") ? publicFileToDataUri(p) : p,
  );

  try {
    const res = await fetch(`${MESHY_BASE}/openapi/v1/multi-image-to-3d`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_urls: imageData,
        ai_model: input.aiModel ?? "meshy-6",
        enable_pbr: input.enablePbr ?? true,
        should_texture: true,
        texture_prompt: input.prompt,
        target_formats: ["glb"],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, reason: `Meshy multi-image error ${res.status}: ${text.slice(0, 200)}` };
    }
    const data = (await res.json()) as { result?: string };
    return {
      ok: true,
      task: {
        id: data.result ?? crypto.randomUUID(),
        status: "PENDING",
        startTime: Date.now(),
      },
    };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "Network error" };
  }
}

/** Poll a task for status + final model URLs. Tries multi-image endpoint
 *  first (our default path), then falls back to single-image. */
export async function pollImageTo3D(
  taskId: string,
): Promise<{ ok: true; task: MeshyTask } | { ok: false; reason: string }> {
  const apiKey = process.env.MESHY_API_KEY;
  if (!apiKey) {
    return { ok: true, task: mockPoll(taskId) };
  }

  // Try multi-image endpoint first; if 404, fall back to single-image.
  for (const path of [`/openapi/v1/multi-image-to-3d/${taskId}`, `/openapi/v1/image-to-3d/${taskId}`]) {
    try {
      const res = await fetch(`${MESHY_BASE}${path}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.status === 404) continue; // try next endpoint
      if (!res.ok) {
        return { ok: false, reason: `Meshy poll error ${res.status}` };
      }
      const data = (await res.json()) as {
        status?: string;
        progress?: number;
        model_urls?: { glb?: string; fbx?: string; obj?: string; usdz?: string; stl?: string };
        error?: string;
      };
      return {
        ok: true,
        task: {
          id: taskId,
          status: (data.status as MeshyTask["status"]) ?? "IN_PROGRESS",
          progress: data.progress,
          modelUrls: data.model_urls,
          error: data.error,
        },
      };
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : "Network error" };
    }
  }
  return { ok: false, reason: "Task tidak ditemukan di kedua endpoint." };
}

// ===== MOCK HELPERS (no API key configured) =====
const mockStore = new Map<string, { startTime: number; completed: boolean }>();

function mockTask(input: MeshyCreateInput | MeshyMultiImageInput): MeshyTask {
  const id = `mock-${crypto.randomUUID()}`;
  mockStore.set(id, { startTime: Date.now(), completed: false });
  return { id, status: "PENDING", startTime: Date.now() };
}

function mockPoll(taskId: string): MeshyTask {
  const record = mockStore.get(taskId) ?? { startTime: Date.now(), completed: false };
  const elapsed = Date.now() - record.startTime;
  // Simulate ~10s pipeline: PENDING → IN_PROGRESS (30/60/90) → SUCCEEDED
  if (elapsed < 1500) {
    return { id: taskId, status: "PENDING", startTime: record.startTime };
  }
  if (elapsed < 9000) {
    const progress = Math.min(95, Math.floor(elapsed / 100));
    return { id: taskId, status: "IN_PROGRESS", progress, startTime: record.startTime };
  }
  record.completed = true;
  mockStore.set(taskId, record);
  return {
    id: taskId,
    status: "SUCCEEDED",
    modelUrls: { glb: "mock://meshy/generated-model.glb" },
    startTime: record.startTime,
  };
}
