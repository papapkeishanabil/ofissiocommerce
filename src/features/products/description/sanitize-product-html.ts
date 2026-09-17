import "server-only";

import sanitizeHtml from "sanitize-html";

/**
 * Sanitasi HTML deskripsi produk untuk dirender di storefront.
 *
 * Dipanggil hanya di jalur server (repository) — modul ini menandai dirinya
 * `server-only` agar import dari bundle client (mis. lewat cart-store) gagal
 * saat build, bukan membengkakkan bundle secara senyap.
 *
 * Tipografi hasil render diatur oleh class CSS `.rich-text` (globals.css);
 * inline style sengaja tidak diizinkan.
 */

const BLOCK_MARKUP =
  /<(?:p|br|div|ul|ol|li|h[1-6]|blockquote|table|thead|tbody|tr|td|th|figure|figcaption|img|hr)\b/i;

const ONLY_EMPTY_PARAGRAPHS = /^(?:<p(?:\s[^>]*)?>\s*<\/p>\s*)+$/i;

const BASE_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "strong", "b", "em", "i", "u", "s",
    "ul", "ol", "li", "h2", "h3", "h4", "blockquote",
    "a", "span", "img", "figure", "figcaption", "hr",
    "code", "pre", "table", "thead", "tbody", "tr", "td", "th",
  ],
  allowedAttributes: {
    a: ["href", "title"],
    img: ["src", "alt", "width", "height"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow" }),
  },
};

interface ProductDescriptionSanitizeOptions {
  /** Judul produk yang sudah tampil di halaman dan tidak perlu diulang di isi deskripsi. */
  productName?: string;
  /** Label fakta yang sudah ditampilkan pada tabel spesifikasi terstruktur. */
  structuredFactLabels?: string[];
}

const FACT_LABEL_ALIASES: Record<string, string[]> = {
  material: ["material", "bahan"],
  bahan: ["material", "bahan"],
  color: ["color", "warna"],
  warna: ["color", "warna"],
  size: ["size", "ukuran"],
  ukuran: ["size", "ukuran"],
  sleeve: ["sleeve", "tipe lengan", "panjang lengan", "jenis lengan"],
  "tipe lengan": ["sleeve", "tipe lengan", "panjang lengan", "jenis lengan"],
  "panjang lengan": ["sleeve", "tipe lengan", "panjang lengan", "jenis lengan"],
};

function comparableText(value: string) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("id-ID");
}

function expandedFactLabels(labels: string[]) {
  const expanded = new Set<string>();
  for (const label of labels) {
    const normalizedLabel = comparableText(label);
    expanded.add(normalizedLabel);
    for (const alias of FACT_LABEL_ALIASES[normalizedLabel] ?? []) expanded.add(alias);
  }
  return [...expanded].filter(Boolean);
}

function startsWithStructuredFact(text: string, labels: string[]) {
  const normalizedText = comparableText(text);
  return labels.some((label) => {
    if (!normalizedText.startsWith(label)) return false;
    const remainder = normalizedText.slice(label.length);
    return /^(?:\s*[.:;]\s*)+\S/.test(remainder);
  });
}

const REDUNDANT_STATUS_STATEMENTS = new Set([
  "ready stock",
  "ukuran lengkap",
  "siap tambah bordir",
  "siap ditambah bordir",
]);

function isRedundantStatusBlock(text: string) {
  const statements = comparableText(text)
    .split(/[.!?]+/)
    .map((statement) => statement.trim())
    .filter(Boolean);
  return statements.length > 0 && statements.every((statement) => REDUNDANT_STATUS_STATEMENTS.has(statement));
}

function canonicalizeDetailSection(html: string) {
  const bulletized = html.replace(/<ol>/gi, "<ul>").replace(/<\/ol>/gi, "</ul>");
  const withoutParagraphHeading = bulletized.replace(
    /<p>\s*<strong>\s*(?:spesifikasi(?: produk| kemeja)?|detail produk|fitur produk|keunggulan produk)\s*:?\s*<\/strong>\s*<\/p>\s*/gi,
    "",
  );
  const withoutLegacyHeading = withoutParagraphHeading.replace(
    /<h[2-4]>\s*(?:<strong>)?\s*(?:spesifikasi(?: produk| kemeja)?|detail produk|fitur produk|keunggulan produk)\s*:?\s*(?:<\/strong>)?\s*<\/h[2-4]>\s*/gi,
    "",
  );
  if (!/<ul\b/i.test(withoutLegacyHeading)) return withoutLegacyHeading;
  return withoutLegacyHeading.replace(/<ul\b/i, "<h3>Detail Produk</h3><ul");
}

/** Escape teks polos sebelum dibungkus menjadi paragraf. */
function escapePlainText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Teks tanpa markup blok → paragraf terpisah (\n\n) dan baris baru (\n tunggal). */
function wrapPlainTextAsParagraphs(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) =>
      `<p>${escapePlainText(paragraph).replace(/\n/g, "<br />")}</p>`,
    )
    .join("\n");
}

/**
 * Hasilkan HTML deskripsi yang aman untuk `dangerouslySetInnerHTML` di
 * storefront. Input kosong/whitespace menghasilkan string kosong (pemanggil
 * memakai fallback teks polos).
 */
export function sanitizeProductDescriptionHtml(
  html: string,
  options: ProductDescriptionSanitizeOptions = {},
): string {
  const input = html?.trim() ?? "";
  if (!input) return "";
  const source = BLOCK_MARKUP.test(input)
    ? input
    : wrapPlainTextAsParagraphs(input);
  // Normalisasi nbsp (entity &nbsp; maupun karakter U+00A0, termasuk run
  // campuran) ke satu spasi biasa SEBELUM sanitize \u2014 parser tidak perlu
  // menanganinya dan exclusiveFilter ikut melihat <p> yang jadi kosong.
  const denbsped = source.replace(/(?:&nbsp;|\u00A0)+/gi, " ");
  const productName = comparableText(options.productName ?? "");
  const structuredFactLabels = expandedFactLabels(options.structuredFactLabels ?? []);
  const cleaned = sanitizeHtml(denbsped, {
    ...BASE_SANITIZE_OPTIONS,
    // Bersihkan filler editor lama, judul produk berulang, dan fakta yang sudah
    // punya tempat tetap pada tabel spesifikasi di bawah deskripsi.
    exclusiveFilter: (frame) => {
      const text = frame.text.trim();
      if ((frame.tag === "p" || frame.tag === "li") && !text && frame.mediaChildren.length === 0) return true;
      if (["h2", "h3", "h4"].includes(frame.tag) && productName && comparableText(text) === productName) return true;
      if (frame.tag === "p" && isRedundantStatusBlock(text)) return true;
      return frame.tag === "li" && startsWithStructuredFact(text, structuredFactLabels);
    },
  }).trim();
  const canonical = canonicalizeDetailSection(cleaned);
  // Hasil yang hanya berisi paragraf kosong dianggap kosong.
  return ONLY_EMPTY_PARAGRAPHS.test(canonical) ? "" : canonical;
}
