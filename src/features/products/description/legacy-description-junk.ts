/**
 * Deteksi dan perbaikan junk deskripsi legacy di WooCommerce.
 *
 * Asal junk: import CSV lama menulis `\n` (backslash-n) ke deskripsi; backslash
 * termakan di jalur import sehingga tersisa huruf "n" literal. Bentuk nyata yang
 * ditemukan pada data live (KK-006 #193 dkk):
 *   - "n" di awal baris menempel ke huruf besar/digit/`&`/`<`  → "\nnBahan", "\nn1."
 *   - "n" sendirian satu baris (pemisah paragraf rusak)          → "<br />\nn<br />"
 *   - "n&nbsp;" di ujung paragraf                                → "...\nn&nbsp;</p>"
 *   - "n" menempel di tengah teks (newline tak tersisa)          → "SAFIRnUkuran", "nyaman.nBeragam"
 *   - token "n" sendirian di antara tag                          → "<ul>\nn\n</ul>"
 *
 * Aturan bersifat konservatif: "n" yang diikuti huruf kecil (kata normal seperti
 * "nyaman") tidak pernah disentuh. Regex tengah-teks hanya berjalan pada segmen
 * TEKS (di luar tag) sehingga URL/atribut tidak mungkin terkorupsi. Transformasi
 * idempoten — menjalankan dua kali tidak mengubah hasil.
 */

const NBSP = "(?:&nbsp;|\\u00A0)";

/** Baris yang hanya berisi "n" (+ spasi/nbsp) — pemisah paragraf rusak. */
const LONE_N_LINE = new RegExp(`^[ \\t]*n(?:${NBSP}|[ \\t])*$`);
/** "n" nyasar di awal baris, menempel langsung ke huruf besar/digit/&/<. */
const GLUED_N = /^n(?=[A-Z0-9&<])/;
/** "n" nyasar tepat setelah tag pembuka blok / <br> di tengah baris. */
const INLINE_N = /(<p[^>]*>|<br\s*\/?>)n(?=[A-Z0-9&<])/g;
/** Run dua entitas nbsp atau lebih (termasuk campuran spasi). */
const NBSP_RUN = new RegExp(`(?:${NBSP})(?:[ \\t]*(?:${NBSP}))+`, "g");
/** Paragraf yang hanya berisi whitespace/nbsp. */
const EMPTY_P = new RegExp(`<p(?:\\s[^>]*)?>(?:\\s|${NBSP})*</p>`, "g");
/** nbsp yang menempel tepat sebelum <br>, </p>, atau akhir baris — sisa junk ekor. */
const TRAILING_NBSP = new RegExp(`(?:${NBSP})+(?=<br\\s*\\/?>|</p>|$)`, "gm");

/** Segmen teks: "n" menempel setelah tanda baca → kembalikan jadi pemisah baris.
 *  Lookahead `$` menutup kasus run-n di ujung segmen (tag memotong teks). */
const N_AFTER_PUNCT = /([.,:;!?])n+(?=[A-Z0-9&]|$)/g;
/** Segmen teks: "n" menempel di antara huruf besar/digit → pemisah baris. */
const N_BETWEEN_ALNUM = /([A-Z0-9])n+(?=[A-Z0-9]|$)/g;
/** Segmen teks: kata berhuruf kecil + run-n + huruf besar/digit menempel
 *  ("TropicalnKancing"). Run 1 = n murni junk; run ≥2 = sisakan SATU n karena
 *  banyak kata Indonesia berakhiran-n (layanan, kantor, ukuran) — lebih aman
 *  menyisakan satu n ekstra daripada menghapus huruf asli. Lookahead WAJIB huruf
 *  besar/digit (bukan $) agar kata sah berakhiran-n di ujung segmen tak tersentuh. */
const N_AFTER_LOWER = /([a-z])n+(?=[A-Z0-9&])/g;
/** Segmen teks: token "n" yang berdiri sendiri (bukan bagian kata). */
const STANDALONE_N = /(^|[\s.,:;!?])n(?=[\s.,:;!?A-Z0-9&]|$)/g;

/** Maksimum <br /> dari satu run "n" — run ekstra dibuang. */
const MAX_BR_PER_RUN = 2;

export interface LegacyDescriptionRepair {
  html: string;
  appliedRules: string[];
}

/** Bagi HTML menjadi tag dan segmen teks; hanya segmen teks dipetakan. */
function mapTextSegments(html: string, transform: (text: string) => string): string {
  return html
    .split(/(<[^>]*>)/)
    .map((part) => (part.startsWith("<") ? part : transform(part)))
    .join("");
}

/** Apakah salah satu segmen teks memenuhi predikat. */
function someTextSegment(html: string, predicate: (text: string) => boolean): boolean {
  return html
    .split(/(<[^>]*>)/)
    .some((part) => !part.startsWith("<") && predicate(part));
}

/** test() pada regex /g bersifat stateful (lastIndex) — reset agar stabil. */
function testGlobal(re: RegExp, value: string): boolean {
  re.lastIndex = 0;
  return re.test(value);
}

function brs(runLength: number): string {
  return "<br />".repeat(Math.min(runLength, MAX_BR_PER_RUN));
}

function countNs(match: string): number {
  return (match.match(/n/g) ?? []).length;
}

/** Apakah segmen teks mengandung bentuk junk tengah-teks. */
function hasMidTextJunk(text: string): boolean {
  if (!text.trim()) return false;
  if (/^\s*n\s*$/.test(text)) return true;
  return (
    testGlobal(N_AFTER_PUNCT, text) ||
    testGlobal(N_BETWEEN_ALNUM, text) ||
    testGlobal(N_AFTER_LOWER, text) ||
    testGlobal(STANDALONE_N, text)
  );
}

/** Bersihkan junk tengah-teks pada satu segmen teks (tag tidak pernah masuk sini). */
function repairMidTextJunk(text: string): string {
  return text
    .replace(N_AFTER_PUNCT, (match, punct: string) => punct + brs(countNs(match)))
    .replace(N_BETWEEN_ALNUM, (match, before: string) => before + brs(countNs(match)))
    .replace(N_AFTER_LOWER, (match, before: string) => {
      const run = countNs(match);
      return before + (run > 1 ? "n" : "") + "<br />";
    })
    .replace(STANDALONE_N, (match, delimiter: string) => `${delimiter}<br />`);
}

/** Apakah HTML deskripsi mengandung signature junk legacy (untuk script repair). */
export function hasLegacyDescriptionJunk(html: string): boolean {
  if (!html) return false;
  const lines = html.split(/\r?\n/);
  const hasJunkLine = lines.some(
    (line) => LONE_N_LINE.test(line) || GLUED_N.test(line),
  );
  return (
    hasJunkLine ||
    testGlobal(INLINE_N, html) ||
    testGlobal(NBSP_RUN, html) ||
    testGlobal(EMPTY_P, html) ||
    testGlobal(TRAILING_NBSP, html) ||
    someTextSegment(html, hasMidTextJunk)
  );
}

/** Bersihkan junk legacy dari HTML deskripsi. Mengembalikan hasil + rule yang diterapkan. */
export function repairLegacyDescriptionHtml(html: string): LegacyDescriptionRepair {
  const applied: string[] = [];
  if (!html) return { html, appliedRules: applied };

  // 1) Per baris: buang "n" nyasar di awal baris dan baris yang hanya berisi "n".
  let lines = html.split(/\r?\n/);
  let lineChanged = false;
  lines = lines.map((line) => {
    if (LONE_N_LINE.test(line)) {
      lineChanged = true;
      return "";
    }
    if (GLUED_N.test(line)) {
      lineChanged = true;
      return line.replace(GLUED_N, "");
    }
    return line;
  });
  if (lineChanged) applied.push("strip-junk-n");

  let result = lines.join("\n");

  // 2) "n" nyasar setelah <p>/<br> di tengah baris (mis. "<p>nKemeja").
  const inlined = result.replace(INLINE_N, "$1");
  if (inlined !== result) {
    applied.push("strip-inline-junk-n");
    result = inlined;
  }

  // 3) Junk tengah-teks — hanya pada segmen teks; tag dan atribut aman.
  const midtext = mapTextSegments(result, (text) =>
    hasMidTextJunk(text) ? repairMidTextJunk(text) : text,
  );
  if (midtext !== result) {
    applied.push("strip-midtext-junk-n");
    result = midtext;
  }

  // 4) Run nbsp ≥2 → satu spasi.
  const collapsed = result.replace(NBSP_RUN, " ");
  if (collapsed !== result) {
    applied.push("collapse-nbsp-run");
    result = collapsed;
  }

  // 5) nbsp yang menempel sebelum <br>/</p>/akhir baris (sisa ekor "n&nbsp;").
  const trailed = result.replace(TRAILING_NBSP, "");
  if (trailed !== result) {
    applied.push("strip-trailing-nbsp");
    result = trailed;
  }

  // 6) Paragraf kosong.
  const unemptied = result.replace(EMPTY_P, "");
  if (unemptied !== result) {
    applied.push("drop-empty-p");
    result = unemptied;
  }

  // 7) Rapikan spasi di ujung baris + trim keseluruhan.
  const tidied = result
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .trim();
  if (tidied !== result) {
    applied.push("tidy");
    result = tidied;
  }

  return { html: result, appliedRules: applied };
}

/** Pratinjau satu baris untuk laporan dry-run; nbsp divisualkan sebagai "·". */
export function junkPreview(html: string, maxChars = 240): string {
  const normalized = html
    .replace(/&nbsp;/g, "·")
    .replace(/\u00A0/g, "·")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.length > maxChars
    ? `${normalized.slice(0, maxChars)}…`
    : normalized;
}
