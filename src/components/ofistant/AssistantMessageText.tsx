// src/components/ofistant/AssistantMessageText.tsx
// Merender teks jawaban Ofistant sebagai blok: paragraf dipisah baris, baris
// berawalan "- "/"• "/angka menjadi daftar rapi. HTML menciutkan newline, jadi
// jawaban multi-baris dari rule engine / LLM harus diparse — tanpa dependency
// markdown eksternal.

"use client";

import type { ReactNode } from "react";

type Block =
  | { kind: "paragraph"; text: string }
  | { kind: "bullet"; items: string[] }
  | { kind: "numbered"; items: { marker: string; text: string }[] };

const BULLET_RE = /^[-•*]\s+(.*)$/;
const NUMBERED_RE = /^(\d+[.)])\s+(.*)$/;

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let bullets: string[] = [];
  let numbered: { marker: string; text: string }[] = [];

  const flush = () => {
    if (bullets.length) {
      blocks.push({ kind: "bullet", items: bullets });
      bullets = [];
    }
    if (numbered.length) {
      blocks.push({ kind: "numbered", items: numbered });
      numbered = [];
    }
  };

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const bullet = line.match(BULLET_RE);
    if (bullet?.[1] !== undefined) {
      if (numbered.length) flush();
      bullets.push(bullet[1]);
      continue;
    }
    const num = line.match(NUMBERED_RE);
    if (num?.[1] !== undefined && num[2] !== undefined) {
      if (bullets.length) flush();
      numbered.push({ marker: num[1], text: num[2] });
      continue;
    }
    flush();
    blocks.push({ kind: "paragraph", text: line });
  }
  flush();
  return blocks;
}

/** Bold sederhana **teks** bila LLM lolos dari aturan "tanpa asterisk". */
function renderInline(text: string): ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    part === ""
      ? null
      : i % 2 === 1
        ? <strong key={i} className="font-semibold">{part}</strong>
        : <span key={i}>{part}</span>,
  );
}

export function AssistantMessageText({ text }: { text: string }) {
  const blocks = parseBlocks(text);
  return (
    <div className="flex flex-col gap-1.5">
      {blocks.map((block, i) => {
        if (block.kind === "paragraph") {
          return <p key={i}>{renderInline(block.text)}</p>;
        }
        if (block.kind === "bullet") {
          return (
            <ul key={i} className="flex flex-col gap-1">
              {block.items.map((item, j) => (
                <li key={j} className="flex gap-2">
                  <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-ochre-500" />
                  <span className="min-w-0 flex-1">{renderInline(item)}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <ol key={i} className="flex flex-col gap-1">
            {block.items.map((item, j) => (
              <li key={j} className="flex gap-2">
                <span aria-hidden className="shrink-0 font-semibold text-brand-700">{item.marker}</span>
                <span className="min-w-0 flex-1">{renderInline(item.text)}</span>
              </li>
            ))}
          </ol>
        );
      })}
    </div>
  );
}
