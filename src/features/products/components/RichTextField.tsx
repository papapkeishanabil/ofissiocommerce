"use client";

import {
  Bold,
  Check,
  Code2,
  Eraser,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  SquarePen,
  Strikethrough,
  Undo2,
  Unlink,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

/**
 * Editor WYSIWYG untuk field deskripsi produk (HTML string masuk/keluar —
 * kontrak form tidak berubah). Toolbar memakai label Bahasa Indonesia agar
 * admin non-teknis bisa memformat tanpa menulis HTML.
 *
 * `immediatelyRender: false` wajib untuk TipTap v3 + React 19 (hidrasi SSR);
 * komponen ini juga dimuat via dynamic { ssr: false } dari AdminProductForm.
 */

interface RichTextFieldProps {
  value: string;
  onChange: (html: string) => void;
  maxLength: number;
  minHeight?: number;
  placeholder?: string;
  disabled?: boolean;
}

/** HTML yang secara visual kosong → dianggap string kosong oleh form/zod. */
export function isEmptyRichText(html: string): boolean {
  const stripped = html
    .replace(/<p(?:\s[^>]*)?>(?:\s|<br\s*\/?>|&nbsp;|\u00A0)*<\/p>/gi, "")
    .replace(/^(?:<br\s*\/?>|\s|&nbsp;|\u00A0)+$/i, "");
  return stripped.length === 0;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function RichTextField({
  value,
  onChange,
  maxLength,
  minHeight = 144,
  placeholder = "",
  disabled = false,
}: RichTextFieldProps) {
  // Ref callback agar opsi editor tidak perlu dibuat ulang saat render.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const [, setSelectionTick] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true },
      }),
    ],
    content: value,
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "rich-editor-content",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": placeholder || "Editor teks kaya",
      },
    },
    onUpdate({ editor: current }) {
      const html = current.getHTML();
      onChangeRef.current(isEmptyRichText(html) ? "" : html);
    },
    onSelectionUpdate() {
      // Paksa render ulang agar status tombol toolbar (aria-pressed) akurat.
      setSelectionTick((tick) => tick + 1);
    },
  });

  const [showSource, setShowSource] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const overLimit = value.length > maxLength;
  const nearLimit = value.length >= maxLength * 0.9;
  const empty = isEmptyRichText(value);
  const canLink = Boolean(editor && (!editor.isEmpty || editor.isActive("link")));

  // Sinkronisasi nilai eksternal (load produk / kembali dari mode HTML) tanpa
  // mengganggu kursor: hanya setContent bila berbeda dari dokumen aktif.
  useEffect(() => {
    if (!editor || value === editor.getHTML()) return;
    try {
      editor.commands.setContent(value, { emitUpdate: false });
    } catch {
      // HTML legacy rusak → coba lagi sebagai teks biasa agar editor tetap hidup.
      try {
        editor.commands.setContent(`<p>${escapeHtml(value)}</p>`, { emitUpdate: false });
      } catch {
        // Pertahankan konten terakhir yang valid.
      }
    }
  }, [value, editor]);

  useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [disabled, editor]);

  function openLinkPanel() {
    if (!editor) return;
    setLinkUrl((editor.getAttributes("link").href as string) ?? "");
    setLinkOpen(true);
  }

  function applyLink() {
    if (!editor) return;
    const trimmed = linkUrl.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      const href = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    setLinkOpen(false);
  }

  return (
    <div
      className="rich-editor relative"
      data-over={overLimit ? "true" : undefined}
      style={{ "--rich-editor-min-h": `${minHeight}px` } as CSSProperties}
    >
      {!showSource && (
        <div className="rich-editor-toolbar" role="toolbar" aria-label="Format teks">
          <ToolbarButton
            label="Tebal (Ctrl+B)"
            icon={<Bold className="h-4 w-4" />}
            pressed={editor?.isActive("bold") ?? false}
            disabled={disabled || !editor}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          />
          <ToolbarButton
            label="Miring (Ctrl+I)"
            icon={<Italic className="h-4 w-4" />}
            pressed={editor?.isActive("italic") ?? false}
            disabled={disabled || !editor}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          />
          <ToolbarButton
            label="Strikethrough"
            icon={<Strikethrough className="h-4 w-4" />}
            pressed={editor?.isActive("strike") ?? false}
            disabled={disabled || !editor}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
          />
          <span className="toolbar-sep" aria-hidden="true" />
          <ToolbarButton
            label="Judul 2"
            icon={<Heading2 className="h-4 w-4" />}
            pressed={editor?.isActive("heading", { level: 2 }) ?? false}
            disabled={disabled || !editor}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          />
          <ToolbarButton
            label="Judul 3"
            icon={<Heading3 className="h-4 w-4" />}
            pressed={editor?.isActive("heading", { level: 3 }) ?? false}
            disabled={disabled || !editor}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          />
          <span className="toolbar-sep" aria-hidden="true" />
          <ToolbarButton
            label="Daftar poin"
            icon={<List className="h-4 w-4" />}
            pressed={editor?.isActive("bulletList") ?? false}
            disabled={disabled || !editor}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          />
          <ToolbarButton
            label="Daftar bernomor"
            icon={<ListOrdered className="h-4 w-4" />}
            pressed={editor?.isActive("orderedList") ?? false}
            disabled={disabled || !editor}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          />
          <ToolbarButton
            label="Kutipan"
            icon={<Quote className="h-4 w-4" />}
            pressed={editor?.isActive("blockquote") ?? false}
            disabled={disabled || !editor}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          />
          <span className="toolbar-sep" aria-hidden="true" />
          <ToolbarButton
            label={canLink ? "Tautan" : "Pilih teks dulu untuk menautkan"}
            icon={<Link2 className="h-4 w-4" />}
            pressed={editor?.isActive("link") ?? false}
            disabled={disabled || !editor || !canLink}
            onClick={openLinkPanel}
          />
          <ToolbarButton
            label="Hapus format"
            icon={<Eraser className="h-4 w-4" />}
            pressed={false}
            disabled={disabled || !editor}
            onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
          />
          <span className="toolbar-sep" aria-hidden="true" />
          <ToolbarButton
            label="Urungkan (Ctrl+Z)"
            icon={<Undo2 className="h-4 w-4" />}
            pressed={false}
            disabled={disabled || !editor || !editor.can().undo()}
            onClick={() => editor?.chain().focus().undo().run()}
          />
          <ToolbarButton
            label="Ulangi (Ctrl+Y)"
            icon={<Redo2 className="h-4 w-4" />}
            pressed={false}
            disabled={disabled || !editor || !editor.can().redo()}
            onClick={() => editor?.chain().focus().redo().run()}
          />
          <span className="toolbar-sep" aria-hidden="true" />
          <ToolbarButton
            label="Mode HTML (edit sumber)"
            icon={<Code2 className="h-4 w-4" />}
            pressed={false}
            disabled={disabled}
            onClick={() => setShowSource(true)}
          />
        </div>
      )}

      {!showSource && linkOpen && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-white px-3 py-2">
          <Link2 className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
          <input
            className="min-h-9 flex-1 min-w-48 rounded-md border border-line px-2 py-1 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            type="url"
            value={linkUrl}
            placeholder="https://contoh.com/halaman"
            onChange={(event) => setLinkUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyLink();
              }
              if (event.key === "Escape") setLinkOpen(false);
            }}
            autoFocus
          />
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1 rounded-md bg-brand-700 px-3 text-xs font-semibold text-white hover:bg-brand-800"
            onClick={applyLink}
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" /> Terapkan
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1 rounded-md border border-line px-3 text-xs font-medium text-ink-muted hover:bg-cool-50"
            onClick={() => {
              editor?.chain().focus().extendMarkRange("link").unsetLink().run();
              setLinkOpen(false);
            }}
          >
            <Unlink className="h-3.5 w-3.5" aria-hidden="true" /> Hapus tautan
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1 rounded-md border border-line px-3 text-xs font-medium text-ink-muted hover:bg-cool-50"
            onClick={() => setLinkOpen(false)}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" /> Batal
          </button>
        </div>
      )}

      {showSource ? (
        <div>
          <div className="flex items-center justify-between gap-3 border-b border-line bg-ochre-50 px-3 py-1.5 text-xs text-ochre-700">
            <span className="inline-flex items-center gap-1">
              <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
              Mode HTML aktif — Anda sedang menyunting sumber mentah.
            </span>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-md border border-ochre-300 bg-white px-2.5 font-semibold text-ochre-700 hover:bg-ochre-100"
              onClick={() => setShowSource(false)}
            >
              <SquarePen className="h-3.5 w-3.5" aria-hidden="true" /> Kembali ke editor visual
            </button>
          </div>
          <textarea
            className="rich-editor-content block w-full resize-y font-mono text-xs"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            maxLength={maxLength}
            disabled={disabled}
            spellCheck={false}
            style={{ minHeight }}
            aria-label="Sumber HTML deskripsi"
          />
        </div>
      ) : (
        <div className="relative">
          <EditorContent editor={editor} />
          {empty && placeholder && !disabled && (
            <span className="pointer-events-none absolute left-3 top-2.5 text-[15px] text-slate-400">
              {placeholder}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-line bg-white px-3 py-1.5 text-[11px]">
        <span className="text-ink-subtle">
          {showSource ? "Mode HTML" : "Enter = paragraf baru · Shift+Enter = baris baru"}
        </span>
        <span
          className={
            overLimit
              ? "font-semibold text-red-600"
              : nearLimit
                ? "font-semibold text-ochre-700"
                : "text-ink-subtle"
          }
        >
          {value.length.toLocaleString("id-ID")} / {maxLength.toLocaleString("id-ID")} karakter
        </span>
      </div>
    </div>
  );
}

interface ToolbarButtonProps {
  label: string;
  icon: ReactNode;
  pressed: boolean;
  disabled: boolean;
  onClick: () => void;
}

function ToolbarButton({ label, icon, pressed, disabled, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      // Cegah kehilangan seleksi di editor saat tombol toolbar menerima fokus.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}
