// src/lib/meshy/meshy-service.ts
// Server-side wrapper for the Meshy.ai image-to-3d API.
//
// Never expose MESHY_API_KEY to the client — this module is imported only by
// Next.js Route Handlers (/api/3d/meshy/*). When no key is configured, the
// service enters MOCK mode so the UI flow stays demoable.
//
// API reference: https://docs.meshy.ai/en/api/image-to-3d
//   POST https://api.meshy.ai/v2/image-to-3d   → create task
//   GET  https://api.meshy.ai/v2/image-to-3d/{id} → poll status + model URLs

const MESHY_BASE = "https://api.meshy.ai";

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
  status: "IN_QUEUE" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED";
  /** present when SUCCEEDED */
  modelUrls?: {
    glb?: string;
    fbx?: string;
    usdz?: string;
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
    const res = await fetch(`${MESHY_BASE}/v2/image-to-3d`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: input.imageUrl,
        prompt: input.prompt,
        ai_model: input.aiModel ?? "meshy-5",
        enable_pbr: input.enablePbr ?? true,
        should_remesh: input.shouldRemesh ?? true,
        output_formats: ["glb"],
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
  /** 1–4 public image URLs */
  imageUrls: string[];
  prompt?: string;
  aiModel?: string;
  enablePbr?: boolean;
  shouldRemesh?: boolean;
}

/**
 * Multi-Image to 3D — accepts 1–4 image URLs and generates ONE solid GLB mesh.
 * This is the path to a "real" 3D model (volumetrik, not slide/quad-plane).
 *
 * Docs: https://docs.meshy.ai/en/api/multi-image-to-3d
 * Endpoint: POST https://api.meshy.ai/v2/multi-image-to-3d
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

  try {
    const res = await fetch(`${MESHY_BASE}/v2/multi-image-to-3d`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_urls: input.imageUrls,
        prompt: input.prompt,
        ai_model: input.aiModel ?? "meshy-5",
        enable_pbr: input.enablePbr ?? true,
        should_remesh: input.shouldRemesh ?? true,
        output_formats: ["glb"],
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
        status: "IN_QUEUE",
        startTime: Date.now(),
      },
    };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "Network error" };
  }
}

/** Poll a task for status + final model URLs. */
export async function pollImageTo3D(
  taskId: string,
): Promise<{ ok: true; task: MeshyTask } | { ok: false; reason: string }> {
  const apiKey = process.env.MESHY_API_KEY;
  if (!apiKey) {
    return { ok: true, task: mockPoll(taskId) };
  }

  try {
    const res = await fetch(`${MESHY_BASE}/v2/image-to-3d/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      return { ok: false, reason: `Meshy poll error ${res.status}` };
    }
    const data = (await res.json()) as {
      status?: string;
      progress?: number;
      model_urls?: { glb?: string; fbx?: string; usdz?: string };
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

// ===== MOCK HELPERS (no API key configured) =====
const mockStore = new Map<string, { startTime: number; completed: boolean }>();

function mockTask(input: MeshyCreateInput): MeshyTask {
  const id = `mock-${crypto.randomUUID()}`;
  mockStore.set(id, { startTime: Date.now(), completed: false });
  return { id, status: "IN_QUEUE", startTime: Date.now() };
}

function mockPoll(taskId: string): MeshyTask {
  const record = mockStore.get(taskId) ?? { startTime: Date.now(), completed: false };
  const elapsed = Date.now() - record.startTime;
  // Simulate ~10s pipeline: queue → progress 30/60/90 → done
  if (elapsed < 1500) {
    return { id: taskId, status: "IN_QUEUE", startTime: record.startTime };
  }
  if (elapsed < 9000) {
    const progress = Math.min(95, Math.floor(elapsed / 100));
    return { id: taskId, status: "IN_PROGRESS", progress, startTime: record.startTime };
  }
  // DONE — return a fake GLB URL. The viewer will detect it's not a real
  // GLB and stay in depth mode, but the UI flow is exercised end-to-end.
  record.completed = true;
  mockStore.set(taskId, record);
  return {
    id: taskId,
    status: "SUCCEEDED",
    modelUrls: {
      glb: "mock://meshy/generated-model.glb",
    },
    startTime: record.startTime,
  };
}
