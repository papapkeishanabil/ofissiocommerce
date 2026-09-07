import "server-only";

import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";

import type { PdfTextOptions } from "./pdf.types";
import { decodePng } from "./png-decoder";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const LANDSCAPE_WIDTH = 841.89;
const LANDSCAPE_HEIGHT = 595.28;
const MARGIN = 42;

type PdfFont = NonNullable<PdfTextOptions["font"]>;

interface PdfPage {
  ops: string[];
  links: PdfLinkAnnotation[];
  imageNames: string[];
}

interface PdfLinkAnnotation {
  x: number;
  y: number;
  width: number;
  height: number;
  url: string;
}

interface PdfImageEntry {
  name: string;
  /** Stream image siap embed (sudah difilter untuk PDF). */
  stream: Buffer;
  filter: "DCTDecode" | "FlateDecode";
  width: number;
  height: number;
  colorSpace: string;
  smaskStream: Buffer | null;
}

function rgb(hex = "#111827") {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((part) => part + part)
          .join("")
      : clean.padEnd(6, "0").slice(0, 6);
  const value = Number.parseInt(full, 16);
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ];
}

function colorOp(hex: string, stroke = false) {
  const [r, g, b] = rgb(hex).map((value) => value.toFixed(3));
  return `${r} ${g} ${b} ${stroke ? "RG" : "rg"}`;
}

function escapePdfText(value: string) {
  return value
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function fontName(font: PdfFont) {
  if (font === "bold") return "F2";
  if (font === "mono") return "F3";
  return "F1";
}

function estimateTextWidth(text: string, size: number) {
  return text.length * size * 0.52;
}

export class SimplePdfDocument {
  readonly width: number;
  readonly height: number;
  readonly margin = MARGIN;
  private readonly pages: PdfPage[] = [];
  private readonly imageEntries = new Map<string, PdfImageEntry>();
  private page: PdfPage;
  cursorY = MARGIN;

  constructor(options: { orientation?: "portrait" | "landscape" } = {}) {
    this.width =
      options.orientation === "landscape" ? LANDSCAPE_WIDTH : PAGE_WIDTH;
    this.height =
      options.orientation === "landscape" ? LANDSCAPE_HEIGHT : PAGE_HEIGHT;
    this.page = this.addPage();
  }

  addPage() {
    const page: PdfPage = { ops: [], links: [], imageNames: [] };
    this.pages.push(page);
    this.page = page;
    this.cursorY = MARGIN;
    return page;
  }

  ensureSpace(height: number) {
    if (this.cursorY + height > this.height - MARGIN) {
      this.addPage();
    }
  }

  rect(x: number, y: number, width: number, height: number, fill = "#ffffff") {
    this.page.ops.push(
      colorOp(fill),
      `${x.toFixed(2)} ${this.toPdfY(y + height).toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f`,
    );
  }

  polygon(points: Array<[number, number]>, fill = "#ffffff") {
    const [first, ...rest] = points;
    if (!first) return;
    this.page.ops.push(
      colorOp(fill),
      `${first[0].toFixed(2)} ${this.toPdfY(first[1]).toFixed(2)} m`,
      ...rest.map(
        ([x, y]) => `${x.toFixed(2)} ${this.toPdfY(y).toFixed(2)} l`,
      ),
      "h f",
    );
  }

  strokeRect(
    x: number,
    y: number,
    width: number,
    height: number,
    stroke = "#e5e7eb",
    lineWidth = 1,
  ) {
    this.page.ops.push(
      colorOp(stroke, true),
      `${lineWidth.toFixed(2)} w`,
      `${x.toFixed(2)} ${this.toPdfY(y + height).toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re S`,
    );
  }

  line(x1: number, y1: number, x2: number, y2: number, stroke = "#e5e7eb") {
    this.page.ops.push(
      colorOp(stroke, true),
      `1 w ${x1.toFixed(2)} ${this.toPdfY(y1).toFixed(2)} m ${x2.toFixed(2)} ${this.toPdfY(y2).toFixed(2)} l S`,
    );
  }

  link(url: string | null | undefined, x: number, y: number, width: number, height: number) {
    if (!url || width <= 0 || height <= 0) return;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return;
      this.page.links.push({ x, y, width, height, url: parsed.toString() });
    } catch {
      // Invalid links remain visible as text but are never embedded as PDF actions.
    }
  }

  text(
    value: string,
    x: number,
    y: number,
    options: PdfTextOptions = {},
  ) {
    const size = options.size ?? 10;
    const font = options.font ?? "regular";
    const color = options.color ?? "#111827";
    const width = estimateTextWidth(value, size);
    const align = options.align ?? "left";
    const tx =
      align === "right" ? x - width : align === "center" ? x - width / 2 : x;
    this.page.ops.push(
      colorOp(color),
      `BT /${fontName(font)} ${size.toFixed(2)} Tf ${tx.toFixed(2)} ${this.toPdfY(y + size).toFixed(2)} Td (${escapePdfText(value)}) Tj ET`,
    );
  }

  /**
   * Embed gambar raster (JPEG baseline atau PNG depth-8 non-interlaced) di
   * dalam rect (x, y, width, height) — y dari atas halaman. Return false bila
   * format tidak didukung; pemanggil wajib menggambar placeholder sendiri.
   */
  image(bytes: Uint8Array, x: number, y: number, width: number, height: number) {
    if (width <= 0 || height <= 0) return false;
    const entry = this.resolveImageEntry(Buffer.from(bytes));
    if (!entry) return false;
    if (!this.page.imageNames.includes(entry.name)) {
      this.page.imageNames.push(entry.name);
    }
    this.page.ops.push(
      `q ${width.toFixed(2)} 0 0 ${height.toFixed(2)} ${x.toFixed(2)} ${this.toPdfY(y + height).toFixed(2)} cm ${entry.name} Do Q`,
    );
    return true;
  }

  private resolveImageEntry(bytes: Buffer): PdfImageEntry | null {
    const key = createHash("sha256").update(bytes).digest("hex");
    const cached = this.imageEntries.get(key);
    if (cached) return cached;
    const entry = buildImageEntry(bytes);
    if (!entry) return null;
    entry.name = `/Im${this.imageEntries.size + 1}`;
    this.imageEntries.set(key, entry);
    return entry;
  }

  wrappedText(
    value: string,
    x: number,
    y: number,
    width: number,
    options: PdfTextOptions = {},
  ) {
    const size = options.size ?? 10;
    const lineHeight = options.lineHeight ?? size * 1.35;
    const lines = wrapText(value, width, size);
    lines.forEach((line, index) => {
      this.text(line, x, y + index * lineHeight, options);
    });
    return lines.length * lineHeight;
  }

  labelValue(input: {
    label: string;
    value: string;
    x: number;
    y: number;
    width: number;
  }) {
    this.text(input.label.toUpperCase(), input.x, input.y, {
      size: 7,
      font: "bold",
      color: "#64748b",
    });
    return this.wrappedText(input.value || "-", input.x, input.y + 12, input.width, {
      size: 10,
      font: "bold",
      color: "#111827",
    });
  }

  render(): Uint8Array {
    const objects: string[] = [];
    const addObject = (body: string) => {
      objects.push(body);
      return objects.length;
    };

    const fontRegularId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const fontBoldId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
    const fontMonoId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>");

    // XObject gambar dibuat sebelum halaman agar id stabil; stream biner
    // disimpan sebagai string latin1 (1 char = 1 byte, lossless utk PDF).
    const imageObjectIdByName = new Map<string, number>();
    for (const entry of this.imageEntries.values()) {
      let smarkReference = "";
      if (entry.smaskStream) {
        const smaskId = addObject(
          `<< /Type /XObject /Subtype /Image /Width ${entry.width} /Height ${entry.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length ${entry.smaskStream.length} >>\nstream\n${entry.smaskStream.toString("latin1")}\nendstream`,
        );
        smarkReference = ` /SMask ${smaskId} 0 R`;
      }
      const imageId = addObject(
        `<< /Type /XObject /Subtype /Image /Width ${entry.width} /Height ${entry.height} /ColorSpace /${entry.colorSpace} /BitsPerComponent 8 /Filter /${entry.filter}${smarkReference} /Length ${entry.stream.length} >>\nstream\n${entry.stream.toString("latin1")}\nendstream`,
      );
      imageObjectIdByName.set(entry.name, imageId);
    }

    const pageIds: number[] = [];
    const contentIds: number[] = [];

    for (const page of this.pages) {
      const stream = page.ops.join("\n");
      const contentId = addObject(
        `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`,
      );
      contentIds.push(contentId);
      pageIds.push(0);
    }

    const annotationIds = this.pages.map((page) =>
      page.links.map((link) => {
        const left = link.x;
        const bottom = this.toPdfY(link.y + link.height);
        const right = link.x + link.width;
        const top = this.toPdfY(link.y);
        return addObject(
          `<< /Type /Annot /Subtype /Link /Rect [${left.toFixed(2)} ${bottom.toFixed(2)} ${right.toFixed(2)} ${top.toFixed(2)}] /Border [0 0 0] /A << /S /URI /URI (${escapePdfText(link.url)}) >> >>`,
        );
      }),
    );

    const pagesIdPlaceholder = objects.length + this.pages.length + 1;
    for (let index = 0; index < this.pages.length; index += 1) {
      const annotations = annotationIds[index] ?? [];
      const annotationsEntry =
        annotations.length > 0
          ? ` /Annots [${annotations.map((id) => `${id} 0 R`).join(" ")}]`
          : "";
      const page = this.pages[index]!;
      const xobjectsEntry =
        page.imageNames.length > 0
          ? ` /XObject << ${page.imageNames
              .map((name) => `${name} ${imageObjectIdByName.get(name)} 0 R`)
              .join(" ")} >>`
          : "";
      const pageId = addObject(
        `<< /Type /Page /Parent ${pagesIdPlaceholder} 0 R /MediaBox [0 0 ${this.width.toFixed(2)} ${this.height.toFixed(2)}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R /F3 ${fontMonoId} 0 R >>${xobjectsEntry} >> /Contents ${contentIds[index]} 0 R${annotationsEntry} >>`,
      );
      pageIds[index] = pageId;
    }

    const pagesId = addObject(
      `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`,
    );
    const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
    const chunks = ["%PDF-1.4\n%\xE2\xE3\xCF\xD3\n"];
    const offsets: number[] = [0];

    objects.forEach((body, index) => {
      offsets.push(Buffer.byteLength(chunks.join(""), "latin1"));
      chunks.push(`${index + 1} 0 obj\n${body}\nendobj\n`);
    });

    const xrefOffset = Buffer.byteLength(chunks.join(""), "latin1");
    chunks.push(`xref\n0 ${objects.length + 1}\n`);
    chunks.push("0000000000 65535 f \n");
    for (let index = 1; index <= objects.length; index += 1) {
      chunks.push(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
    }
    chunks.push(
      `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
    );
    return Buffer.from(chunks.join(""), "latin1");
  }

  private toPdfY(y: number) {
    return this.height - y;
  }
}

function buildImageEntry(bytes: Buffer): PdfImageEntry | null {
  if (bytes.length > 8 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    const jpeg = parseJpegDimensions(bytes);
    if (!jpeg) return null;
    return {
      name: "",
      stream: bytes,
      filter: "DCTDecode",
      width: jpeg.width,
      height: jpeg.height,
      colorSpace:
        jpeg.components === 1 ? "DeviceGray" : jpeg.components === 4 ? "DeviceCMYK" : "DeviceRGB",
      smaskStream: null,
    };
  }
  try {
    const decoded = decodePng(bytes);
    return {
      name: "",
      stream: deflateSync(decoded.colorData),
      filter: "FlateDecode",
      width: decoded.width,
      height: decoded.height,
      colorSpace: decoded.colorSpace,
      smaskStream: decoded.smaskData ? deflateSync(decoded.smaskData) : null,
    };
  } catch {
    return null;
  }
}

function parseJpegDimensions(bytes: Buffer) {
  let offset = 2;
  let width = 0;
  let height = 0;
  let components = 0;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1]!;
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    if (marker === 0xda) break; // start of scan — dimensi harus sudah terbaca di SOF
    const segmentLength = bytes.readUInt16BE(offset + 2);
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    ) {
      if (marker === 0xc2) return null; // progressive JPEG tidak didukung DCTDecode aman
      height = bytes.readUInt16BE(offset + 5);
      width = bytes.readUInt16BE(offset + 7);
      components = bytes[offset + 9]!;
      break;
    }
    offset += 2 + segmentLength;
  }
  if (!width || !height || (components !== 1 && components !== 3 && components !== 4)) return null;
  return { width, height, components };
}

export function wrapText(value: string, width: number, size: number) {
  const words = String(value || "-").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const parts =
      estimateTextWidth(word, size) > width ? chunkLongWord(word, width, size) : [word];
    const candidate = current ? `${current} ${word}` : word;
    if (parts.length === 1 && estimateTextWidth(candidate, size) <= width) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          current = part;
        } else {
          lines.push(part);
        }
      });
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : ["-"];
}

function chunkLongWord(word: string, width: number, size: number) {
  const maxChars = Math.max(4, Math.floor(width / (size * 0.52)));
  const chunks: string[] = [];
  let index = 0;
  while (index < word.length) {
    let end = Math.min(word.length, index + maxChars);
    if (end < word.length) {
      const segment = word.slice(index, end);
      const preferredCut = Math.max(
        segment.lastIndexOf("-"),
        segment.lastIndexOf("_"),
        segment.lastIndexOf("/"),
      );
      if (preferredCut >= Math.floor(maxChars * 0.45)) {
        end = index + preferredCut + 1;
      }
    }
    chunks.push(word.slice(index, end));
    index = end;
  }
  return chunks.length > 0 ? chunks : [word];
}

export function measurePdfTableRowHeight(input: {
  widths: number[];
  values: string[];
  header?: boolean;
  minHeight?: number;
}) {
  const size = input.header ? 7 : 8;
  const lineHeight = input.header ? 10 : 11;
  const wrapped = input.values.map((value, index) =>
    wrapText(value, Math.max(18, (input.widths[index] ?? 48) - 8), size),
  );
  return Math.max(
    input.minHeight ?? 0,
    22,
    ...wrapped.map((lines) => lines.length * lineHeight + 10),
  );
}

export function pdfTableRow(input: {
  doc: SimplePdfDocument;
  y: number;
  x: number;
  widths: number[];
  values: string[];
  header?: boolean;
  fill?: string;
  minHeight?: number;
  aligns?: Array<"left" | "center" | "right">;
}) {
  const { doc, x, y, widths, values } = input;
  const size = input.header ? 7 : 8;
  const lineHeight = input.header ? 10 : 11;
  const wrapped = values.map((value, index) =>
    wrapText(value, Math.max(18, (widths[index] ?? 48) - 8), size),
  );
  const height = measurePdfTableRowHeight(input);
  if (input.fill) doc.rect(x, y, widths.reduce((total, item) => total + item, 0), height, input.fill);
  let cx = x;
  widths.forEach((width, index) => {
    const align = input.aligns?.[index] ?? "left";
    doc.strokeRect(cx, y, width, height, "#e2e8f0", 0.6);
    (wrapped[index] ?? ["-"]).forEach((line, lineIndex) => {
      const tx =
        align === "right" ? cx + width - 4 : align === "center" ? cx + width / 2 : cx + 4;
      doc.text(line, tx, y + 8 + lineIndex * lineHeight, {
        size,
        font: input.header ? "bold" : "regular",
        color: input.header ? "#0f172a" : "#111827",
        align,
      });
    });
    cx += width;
  });
  return height;
}
