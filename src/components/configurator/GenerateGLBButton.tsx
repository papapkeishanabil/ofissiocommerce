// src/components/configurator/GenerateGLBButton.tsx
// Lets the customer/admin trigger Meshy.ai AI generation of a real 3D model
// from a product photo. Falls back to mock when MESHY_API_KEY isn't set so
// the flow is demoable.
//
// On success, calls onGenerated(glbUrl) so the configurator can swap from
// depth/photo360 mode into true GLB rendering.

"use client";

import { useState } from "react";
import { AlertTriangle, Box, CheckCircle2, Loader2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface GenerateGLBButtonProps {
  /** product photo URL that Meshy can fetch publicly */
  imageUrl: string;
  /** model3d id, used to label the generated model */
  model3dId: string;
  onGenerated: (glbUrl: string) => void;
}

type Phase = "idle" | "creating" | "polling" | "done" | "error";

export function GenerateGLBButton({
  imageUrl,
  model3dId,
  onGenerated,
}: GenerateGLBButtonProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [reason, setReason] = useState<string | null>(null);
  const [mockNote, setMockNote] = useState(false);

  async function handleGenerate() {
    setPhase("creating");
    setReason(null);
    setProgress(0);

    // 1. Create task
    const createRes = await fetch("/api/3d/meshy/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl,
        prompt: `Workwear shirt ${model3dId}, photorealistic, neutral pose`,
      }),
    });
    const createJson = (await createRes.json()) as {
      ok: boolean;
      reason?: string;
      task?: { id: string };
    };
    if (!createJson.ok || !createJson.task) {
      setReason(createJson.reason ?? "Gagal memulai generasi 3D.");
      setPhase("error");
      return;
    }

    // detect mock mode (mock id starts with "mock-")
    if (createJson.task.id.startsWith("mock-")) {
      setMockNote(true);
    }

    // 2. Poll until terminal
    setPhase("polling");
    const taskId = createJson.task.id;
    const startTs = Date.now();
    while (true) {
      // hard timeout (5 min) so we never loop forever
      if (Date.now() - startTs > 5 * 60 * 1000) {
        setReason("Timeout menunggu generasi 3D (5 menit).");
        setPhase("error");
        return;
      }
      await new Promise((r) => setTimeout(r, 1500));
      const pollRes = await fetch(`/api/3d/meshy/poll?taskId=${encodeURIComponent(taskId)}`);
      const pollJson = (await pollRes.json()) as {
        ok: boolean;
        task?: {
          status: string;
          progress?: number;
          modelUrls?: { glb?: string };
          error?: string;
        };
      };
      if (!pollJson.ok || !pollJson.task) {
        setReason("Gagal memeriksa status generasi.");
        setPhase("error");
        return;
      }
      const t = pollJson.task;
      if (typeof t.progress === "number") setProgress(t.progress);
      if (t.status === "SUCCEEDED" && t.modelUrls?.glb) {
        setProgress(100);
        setPhase("done");
        onGenerated(t.modelUrls.glb);
        return;
      }
      if (t.status === "FAILED") {
        setReason(t.error ?? "Generasi 3D gagal.");
        setPhase("error");
        return;
      }
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold text-ink">
            <Sparkles className="h-3.5 w-3.5 text-ochre-500" />
            Tingkatkan ke AI 3D
          </p>
          <p className="mt-0.5 text-[10px] leading-snug text-ink-muted">
            Generate model 3D berkualitas tinggi via Meshy.ai dari foto produk.
            Volumetrik &amp; bisa rotate 360° penuh.
          </p>
        </div>
        {mockNote && (
          <Badge tone="amber" className="shrink-0">
            mock
          </Badge>
        )}
      </div>

      {phase === "idle" && (
        <Button className="mt-3 w-full" size="sm" onClick={handleGenerate}>
          <Box className="h-3.5 w-3.5" />
          Generate Model 3D AI
        </Button>
      )}

      {(phase === "creating" || phase === "polling") && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 text-[11px] text-ink-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" />
            {phase === "creating" ? "Memulai generasi…" : `Memproses ${progress}%`}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand-600 transition-all"
              style={{ width: `${Math.max(5, progress)}%` }}
            />
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Model 3D siap! Memuat GLB…
        </div>
      )}

      {phase === "error" && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{reason}</span>
        </div>
      )}
    </div>
  );
}
