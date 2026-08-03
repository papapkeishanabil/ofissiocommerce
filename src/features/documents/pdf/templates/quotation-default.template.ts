import "server-only";

import { quotationTaxLabel } from "@/features/quotation/quotation.utils";

import { formatInvoiceDate, formatRupiah } from "../../document.utils";
import type { QuotationPdfData, QuotationPdfItem } from "../../document.types";
import { SimplePdfDocument, wrapText } from "../pdf-renderer";
import type { PdfTemplate, PdfTextOptions } from "../pdf.types";

const PRIMARY = "#061a56";
const PRIMARY_DEEP = "#020d35";
const YELLOW = "#f6c900";
const INK = "#101828";
const MUTED = "#5f6c80";
const SURFACE = "#f5f7fb";
const SURFACE_HIGH = "#d8deea";
const GREEN = "#067647";
const AMBER = "#b54708";
const LEFT = 42;
const RIGHT = 553;
const WIDTH = RIGHT - LEFT;
const FOOTER_TOP = 776;
const FOOTER_HEIGHT = 52;
const CONTENT_BOTTOM = FOOTER_TOP - 18;

export const quotationDefaultTemplate: PdfTemplate<QuotationPdfData> = {
  id: "quotation_default",
  kind: "quotation",
  label: "Quotation Ofissio professional",
  render(data) {
    const doc = new SimplePdfDocument();
    drawBrandHeader(doc, data);
    drawQuotationHero(doc, data);
    drawScopeAndMessage(doc, data);
    drawItems(doc, data);
    drawTermsSummaryAndSignature(doc, data);
    drawFooter(doc, data);
    return doc.render();
  },
};

function drawBrandHeader(doc: SimplePdfDocument, data: QuotationPdfData) {
  const badge = data.isFinal
    ? { label: "PENAWARAN FINAL", stroke: "#12a56a", color: GREEN }
    : { label: "DRAFT PREVIEW", stroke: "#fedf89", color: AMBER };

  doc.text("OFISSIO", LEFT, 32, {
    size: 30,
    font: "bold",
    color: PRIMARY,
  });
  doc.text("WORKWEAR & UNIFORM", LEFT + 2, 64, {
    size: 6.6,
    font: "bold",
    color: MUTED,
  });
  doc.strokeRect(RIGHT - 132, 34, 132, 27, badge.stroke, 0.9);
  doc.text(badge.label, RIGHT - 66, 43, {
    size: 8.2,
    font: "bold",
    color: badge.color,
    align: "center",
  });
  doc.text(data.contactEmail, RIGHT, 70, {
    size: 7.2,
    color: MUTED,
    align: "right",
  });
  doc.line(LEFT, 88, RIGHT, 88, SURFACE_HIGH);
  doc.cursorY = 104;
}

function drawQuotationHero(doc: SimplePdfDocument, data: QuotationPdfData) {
  const quotation = data.quotation;
  const y = doc.cursorY;
  const heroHeight = 116;
  const metaCardX = LEFT + 300;
  const metaCardY = y + 14;
  const metaCardWidth = RIGHT - 18 - metaCardX;
  const metaCardHeight = 88;

  doc.rect(LEFT, y, WIDTH, heroHeight, PRIMARY);
  doc.polygon(
    [
      [LEFT, y],
      [LEFT + 18, y],
      [LEFT + 6, y + heroHeight],
      [LEFT, y + heroHeight],
    ],
    YELLOW,
  );

  doc.text("PENAWARAN UNTUK", LEFT + 34, y + 25, {
    size: 8,
    font: "bold",
    color: YELLOW,
  });
  drawLimitedText(doc, quotation.companyName || "-", LEFT + 34, y + 43, 236, {
    size: 14,
    lineHeight: 16,
    font: "bold",
    color: "#ffffff",
  }, 2);
  drawLimitedText(
    doc,
    quotation.shippingDestination || data.locationLabel || "Indonesia",
    LEFT + 34,
    y + 70,
    226,
    {
      size: 7.6,
      lineHeight: 10,
      color: "#d4daeb",
    },
    2,
  );
  drawLimitedText(doc, formatPicLine(data), LEFT + 34, y + 99, 242, {
    size: 7.1,
    lineHeight: 8.4,
    font: "bold",
    color: YELLOW,
  }, 1);

  // The document identity lives in a bounded inset panel. Keeping the title
  // left-aligned prevents wide Helvetica capitals from escaping the hero.
  doc.rect(metaCardX, metaCardY, metaCardWidth, metaCardHeight, PRIMARY_DEEP);
  doc.rect(metaCardX, metaCardY, metaCardWidth, 3, YELLOW);
  doc.text("QUOTATION", metaCardX + 15, metaCardY + 13, {
    size: 21.5,
    font: "bold",
    color: YELLOW,
  });
  doc.text("PENAWARAN RESMI", metaCardX + 16, metaCardY + 39, {
    size: 6.5,
    font: "bold",
    color: "#d4daeb",
  });
  doc.line(
    metaCardX + 15,
    metaCardY + 51,
    metaCardX + metaCardWidth - 15,
    metaCardY + 51,
    "#2c3d72",
  );
  drawHeroMeta(
    doc,
    "Quotation No",
    quotation.quotationNumber,
    metaCardX + 15,
    metaCardY + 59,
    metaCardWidth - 30,
  );
  drawHeroMeta(
    doc,
    "Tanggal",
    formatInvoiceDate(quotation.createdAt),
    metaCardX + 15,
    metaCardY + 70,
    metaCardWidth - 30,
  );
  drawHeroMeta(
    doc,
    "Berlaku sampai",
    quotation.validUntil ? formatInvoiceDate(quotation.validUntil) : "-",
    metaCardX + 15,
    metaCardY + 81,
    metaCardWidth - 30,
  );

  const ribbonY = y + heroHeight;
  doc.polygon(
    [
      [LEFT, ribbonY],
      [RIGHT - 66, ribbonY],
      [RIGHT - 42, ribbonY + 22],
      [LEFT + 20, ribbonY + 22],
    ],
    YELLOW,
  );
  drawLimitedText(doc, validityRibbon(data), LEFT + 34, ribbonY + 7, 400, {
    size: 7.2,
    lineHeight: 9,
    font: "bold",
    color: PRIMARY_DEEP,
  }, 1);
  doc.cursorY = ribbonY + 39;
}

function drawHeroMeta(
  doc: SimplePdfDocument,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
) {
  const labelWidth = 68;
  doc.text(label.toUpperCase(), x, y, {
    size: 5.5,
    font: "bold",
    color: "#9eabc9",
  });
  drawLimitedText(doc, value || "-", x + labelWidth, y, width - labelWidth, {
    size: 6.3,
    lineHeight: 7.5,
    font: "bold",
    color: "#ffffff",
  }, 1);
}

function drawScopeAndMessage(doc: SimplePdfDocument, data: QuotationPdfData) {
  ensureSpace(doc, data, 102);
  const y = doc.cursorY;
  const leftWidth = 238;
  const rightX = LEFT + leftWidth + 22;
  const rightWidth = WIDTH - leftWidth - 22;

  doc.text("RUANG LINGKUP PENAWARAN", LEFT, y, {
    size: 7.2,
    font: "bold",
    color: PRIMARY,
  });
  scopeRow(doc, `${data.quotation.totalQty} pcs`, "Total kebutuhan seragam", LEFT, y + 21, leftWidth);
  scopeRow(
    doc,
    `${data.quotation.embroideryPointCount} titik`,
    data.quotation.embroideryPointCount > 0 ? "Bordir / customization" : "Tanpa bordir",
    LEFT,
    y + 49,
    leftWidth,
  );

  doc.rect(rightX, y, rightWidth, 78, SURFACE);
  doc.rect(rightX, y, rightWidth, 4, YELLOW);
  doc.text("CATATAN PENAWARAN", rightX + 18, y + 18, {
    size: 7.2,
    font: "bold",
    color: PRIMARY,
  });
  drawLimitedText(
    doc,
    data.quotation.customerMessage ||
      "Harga final mencakup produk dan customization sesuai detail. Perubahan spesifikasi setelah persetujuan akan dikonfirmasi kembali.",
    rightX + 18,
    y + 39,
    rightWidth - 36,
    {
      size: 7.4,
      lineHeight: 9.8,
      color: "#344054",
    },
    4,
  );
  doc.cursorY = y + 102;
}

function scopeRow(
  doc: SimplePdfDocument,
  value: string,
  label: string,
  x: number,
  y: number,
  width: number,
) {
  doc.text(value, x, y, {
    size: 13,
    font: "bold",
    color: PRIMARY,
  });
  doc.text(label, x + 72, y + 3, {
    size: 7.4,
    color: MUTED,
  });
  doc.line(x, y + 21, x + width, y + 21, SURFACE_HIGH);
}

function drawItems(doc: SimplePdfDocument, data: QuotationPdfData) {
  ensureSpace(doc, data, 94);
  const widths = [30, 230, 68, 36, 70, 77];
  let y = drawTableHeader(doc, data, doc.cursorY, widths);

  data.items.forEach((item, index) => {
    const rowHeight = calculateItemRowHeight(item, widths[1] ?? 230);
    if (y + rowHeight > CONTENT_BOTTOM) {
      doc.addPage();
      drawMiniHeader(doc, data);
      y = drawTableHeader(doc, data, doc.cursorY, widths, "DETAIL PRODUK (LANJUTAN)");
    }
    drawItemRow(doc, item, index, y, rowHeight, widths);
    y += rowHeight;
  });
  doc.cursorY = y + 21;
}

function drawTableHeader(
  doc: SimplePdfDocument,
  data: QuotationPdfData,
  y: number,
  widths: number[],
  title = "DETAIL PRODUK & CUSTOMIZATION",
) {
  doc.text(title, LEFT, y, {
    size: 9.5,
    font: "bold",
    color: PRIMARY_DEEP,
  });
  const headerY = y + 22;
  doc.rect(LEFT, headerY, WIDTH, 30, PRIMARY);
  const labels = ["No", "Deskripsi", "Ukuran", "Qty", "Harga satuan", "Total"];
  const aligns: Array<"left" | "center" | "right"> = [
    "center",
    "left",
    "left",
    "center",
    "right",
    "right",
  ];
  let x = LEFT;
  labels.forEach((label, index) => {
    const width = widths[index] ?? 60;
    const align = aligns[index] ?? "left";
    doc.text(label.toUpperCase(), columnTextX(x, width, align), headerY + 10, {
      size: 6.4,
      font: "bold",
      color: "#ffffff",
      align,
    });
    x += width;
  });
  doc.text(data.isFinal ? "FINAL" : "DRAFT", RIGHT, y + 2, {
    size: 6.2,
    font: "bold",
    color: data.isFinal ? GREEN : AMBER,
    align: "right",
  });
  return headerY + 30;
}

function drawItemRow(
  doc: SimplePdfDocument,
  item: QuotationPdfItem,
  index: number,
  y: number,
  rowHeight: number,
  widths: number[],
) {
  if (index % 2 === 1) doc.rect(LEFT, y, WIDTH, rowHeight, "#fbfcfe");
  doc.line(LEFT, y + rowHeight, RIGHT, y + rowHeight, SURFACE_HIGH);

  let x = LEFT;
  doc.text(String(index + 1).padStart(2, "0"), x + (widths[0] ?? 30) / 2, y + 15, {
    size: 8,
    color: MUTED,
    align: "center",
  });
  x += widths[0] ?? 30;

  const descriptionWidth = widths[1] ?? 230;
  drawLimitedText(doc, item.productName, x + 8, y + 12, descriptionWidth - 16, {
    size: 8.6,
    lineHeight: 10,
    font: "bold",
    color: PRIMARY_DEEP,
  }, 2);
  drawLimitedText(doc, `SKU ${item.sku} | Warna ${item.selectedColor}`, x + 8, y + 27, descriptionWidth - 16, {
    size: 6.4,
    lineHeight: 8,
    color: MUTED,
  }, 1);
  if (item.customizationSummary && item.customizationSummary !== "-") {
    const customY = y + 40;
    const customLines = Math.min(
      4,
      wrapText(item.customizationSummary, descriptionWidth - 32, 6.4).length,
    );
    doc.rect(x + 8, customY - 5, descriptionWidth - 16, customLines * 8.2 + 10, SURFACE);
    drawLimitedText(doc, item.customizationSummary, x + 16, customY, descriptionWidth - 32, {
      size: 6.4,
      lineHeight: 8.2,
      color: "#344054",
    }, 4);
  }
  x += descriptionWidth;

  drawLimitedText(doc, item.sizeSummary, x + 8, y + 14, (widths[2] ?? 68) - 16, {
    size: 7,
    lineHeight: 9,
    color: INK,
  }, 3);
  x += widths[2] ?? 68;

  doc.text(String(item.totalQty), x + (widths[3] ?? 36) / 2, y + 14, {
    size: 7.5,
    font: "bold",
    color: INK,
    align: "center",
  });
  x += widths[3] ?? 36;

  doc.text(item.unitPrice == null ? "-" : formatRupiah(item.unitPrice), x + (widths[4] ?? 70) - 8, y + 14, {
    size: 6.8,
    color: INK,
    align: "right",
  });
  x += widths[4] ?? 70;

  doc.text(item.lineTotal == null ? "-" : formatRupiah(item.lineTotal), x + (widths[5] ?? 77) - 8, y + 14, {
    size: 7.2,
    font: "bold",
    color: PRIMARY_DEEP,
    align: "right",
  });
}

function calculateItemRowHeight(item: QuotationPdfItem, descriptionWidth: number) {
  if (!item.customizationSummary || item.customizationSummary === "-") return 58;
  const lines = Math.min(
    4,
    wrapText(item.customizationSummary, descriptionWidth - 32, 6.4).length,
  );
  return Math.max(72, 50 + lines * 8.2);
}

function drawTermsSummaryAndSignature(doc: SimplePdfDocument, data: QuotationPdfData) {
  ensureSpace(doc, data, 214);
  const y = doc.cursorY;
  const summaryX = RIGHT - 244;

  drawTerms(doc, data, LEFT, y);
  drawSummary(doc, data, summaryX, y);

  doc.text("LANGKAH BERIKUTNYA", LEFT, y + 145, {
    size: 7,
    font: "bold",
    color: PRIMARY,
  });
  drawLimitedText(
    doc,
    "Buka halaman quotation Ofissio untuk menerima, menolak, atau meminta revisi penawaran ini.",
    LEFT,
    y + 162,
    246,
    {
      size: 7.2,
      lineHeight: 9.6,
      color: "#475467",
    },
    3,
  );
  drawSignature(doc, data, summaryX + 14, y + 151);
  doc.cursorY = y + 214;
}

function drawTerms(doc: SimplePdfDocument, data: QuotationPdfData, x: number, y: number) {
  doc.text("SYARAT & KETENTUAN", x, y, {
    size: 7.2,
    font: "bold",
    color: PRIMARY,
  });
  let ty = y + 20;
  data.terms.slice(0, 4).forEach((term) => {
    doc.rect(x, ty + 3, 4, 4, YELLOW);
    const height = drawLimitedText(doc, term, x + 12, ty, 236, {
      size: 6.9,
      lineHeight: 9,
      color: "#475467",
    }, 2);
    ty += height + 4;
  });
}

function drawSummary(doc: SimplePdfDocument, data: QuotationPdfData, x: number, y: number) {
  const rowRight = x + 244;
  const productSubtotal = data.items.reduce((total, item) => total + item.productSubtotal, 0);
  const embroideryTotal = data.items.reduce((total, item) => total + item.embroideryTotal, 0);
  const itemDiscount = data.items.reduce((total, item) => total + item.discountAmount, 0);
  const discountTotal = itemDiscount + data.quotation.discountTotal;

  summaryRow(doc, "Subtotal produk", productSubtotal, x, y, rowRight);
  summaryRow(doc, "Biaya bordir", embroideryTotal, x, y + 18, rowRight);
  summaryRow(doc, "Diskon", discountTotal, x, y + 36, rowRight);
  summaryRow(doc, quotationTaxLabel(data.quotation), data.quotation.taxTotal, x, y + 54, rowRight);
  summaryRow(doc, "Ongkir estimasi", data.quotation.shippingEstimate, x, y + 72, rowRight);

  doc.rect(x, y + 92, 84, 39, YELLOW);
  doc.rect(x + 84, y + 92, 160, 39, PRIMARY);
  doc.text("TOTAL", x + 18, y + 106, {
    size: 9,
    font: "bold",
    color: PRIMARY_DEEP,
  });
  doc.text(formatRupiah(data.quotation.grandTotal ?? 0), rowRight - 12, y + 105, {
    size: 12.2,
    font: "bold",
    color: "#ffffff",
    align: "right",
  });
}

function summaryRow(
  doc: SimplePdfDocument,
  label: string,
  value: number,
  x: number,
  y: number,
  rightX: number,
) {
  doc.text(label, x + 12, y + 3, {
    size: 6.8,
    color: MUTED,
  });
  doc.text(formatRupiah(value), rightX - 12, y + 3, {
    size: 7.4,
    font: "bold",
    color: INK,
    align: "right",
  });
  doc.line(x, y + 14, rightX, y + 14, SURFACE_HIGH);
}

function drawSignature(doc: SimplePdfDocument, data: QuotationPdfData, x: number, y: number) {
  doc.text("Disahkan oleh", x + 109, y, {
    size: 6.7,
    color: MUTED,
    align: "center",
  });
  doc.line(x + 28, y + 43, x + 190, y + 43, PRIMARY);
  drawLimitedText(doc, data.signerName || "-", x + 109, y + 52, 174, {
    size: 8.7,
    lineHeight: 10,
    font: "bold",
    color: PRIMARY,
    align: "center",
  }, 1);
  doc.text((data.signerTitle || "OFISSIO").toUpperCase(), x + 109, y + 66, {
    size: 6.1,
    font: "bold",
    color: MUTED,
    align: "center",
  });
}

function drawFooter(doc: SimplePdfDocument, data: QuotationPdfData) {
  doc.rect(LEFT, FOOTER_TOP, WIDTH, FOOTER_HEIGHT, PRIMARY);
  doc.polygon(
    [
      [LEFT, FOOTER_TOP],
      [LEFT + 144, FOOTER_TOP],
      [LEFT + 116, FOOTER_TOP + FOOTER_HEIGHT],
      [LEFT, FOOTER_TOP + FOOTER_HEIGHT],
    ],
    YELLOW,
  );
  doc.text("OFISSIO", LEFT + 28, FOOTER_TOP + 18, {
    size: 11,
    font: "bold",
    color: PRIMARY_DEEP,
  });
  doc.text("WORKWEAR & UNIFORM", LEFT + 28, FOOTER_TOP + 33, {
    size: 5.2,
    font: "bold",
    color: PRIMARY_DEEP,
  });
  footerContact(doc, "TEL", data.contactTel, LEFT + 156, FOOTER_TOP + 14);
  footerContact(doc, "WEB", data.contactWeb, LEFT + 292, FOOTER_TOP + 14);
  footerContact(doc, "EMAIL", data.contactEmail, LEFT + 410, FOOTER_TOP + 14);
}

function footerContact(
  doc: SimplePdfDocument,
  label: string,
  value: string,
  x: number,
  y: number,
) {
  doc.text(label, x, y, {
    size: 6.1,
    font: "bold",
    color: YELLOW,
  });
  drawLimitedText(doc, value || "-", x, y + 16, 105, {
    size: 6.7,
    lineHeight: 8,
    color: "#ffffff",
  }, 2);
}

function drawMiniHeader(doc: SimplePdfDocument, data: QuotationPdfData) {
  doc.text("OFISSIO", LEFT, 32, {
    size: 16,
    font: "bold",
    color: PRIMARY,
  });
  doc.text(`Quotation ${data.quotation.quotationNumber}`, RIGHT, 35, {
    size: 7.2,
    color: MUTED,
    align: "right",
  });
  doc.line(LEFT, 58, RIGHT, 58, SURFACE_HIGH);
  doc.cursorY = 82;
}

function ensureSpace(
  doc: SimplePdfDocument,
  data: QuotationPdfData,
  requiredHeight: number,
) {
  if (doc.cursorY + requiredHeight > CONTENT_BOTTOM) {
    doc.addPage();
    drawMiniHeader(doc, data);
  }
}

function drawLimitedText(
  doc: SimplePdfDocument,
  value: string,
  x: number,
  y: number,
  width: number,
  options: PdfTextOptions,
  maxLines: number,
) {
  const size = options.size ?? 10;
  const lineHeight = options.lineHeight ?? size * 1.35;
  const allLines = wrapText(value || "-", width, size);
  const lines = allLines.slice(0, maxLines);
  if (allLines.length > maxLines && lines.length > 0) {
    const lastIndex = lines.length - 1;
    const last = lines[lastIndex] ?? "";
    lines[lastIndex] = last.length > 4 ? `${last.slice(0, last.length - 4)}...` : "...";
  }
  lines.forEach((line, index) => {
    doc.text(line, x, y + index * lineHeight, options);
  });
  return Math.max(lineHeight, lines.length * lineHeight);
}

function columnTextX(x: number, width: number, align: "left" | "center" | "right") {
  if (align === "right") return x + width - 8;
  if (align === "center") return x + width / 2;
  return x + 8;
}

function formatPicLine(data: QuotationPdfData) {
  const quotation = data.quotation;
  const contact = quotation.picEmail || quotation.customerEmail || quotation.userEmail;
  const pic = [quotation.picName, contact].filter(Boolean).join(" | ");
  return pic ? `PIC: ${pic}` : "PIC: -";
}

function validityRibbon(data: QuotationPdfData) {
  const validUntil = data.quotation.validUntil
    ? ` | BERLAKU SAMPAI ${formatInvoiceDate(data.quotation.validUntil)}`
    : "";
  return `${data.locationLabel.toUpperCase()}${validUntil}`;
}
