"use client";

import { useState } from "react";
import { Clipboard, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/Button";

export function AdminBriefApprovalLink({ briefId }: { briefId: string }) {
  const [copied, setCopied] = useState(false);
  const path = `/briefs/${briefId}`;

  async function copy() {
    const url = new URL(path, window.location.origin).toString();
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" onClick={() => void copy()}>
        <Clipboard className="h-4 w-4" aria-hidden="true" />
        {copied ? "Link tersalin" : "Salin link approval"}
      </Button>
      <a
        href={path}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-bold text-ink transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
        Buka halaman
      </a>
    </div>
  );
}
