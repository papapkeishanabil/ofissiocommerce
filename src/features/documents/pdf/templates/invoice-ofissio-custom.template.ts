import "server-only";

import { formatInvoiceDate, formatRupiah } from "../../document.utils";
import type { InvoicePdfData } from "../../document.types";
import { SimplePdfDocument, wrapText } from "../pdf-renderer";
import type { PdfTemplate, PdfTextOptions } from "../pdf.types";

const PRIMARY = "#000314";
const YELLOW = "#fcd400";
const INK = "#101828";
const MUTED = "#667085";
const SURFACE = "#f8f9fa";
const SURFACE_LOW = "#f3f4f5";
const SURFACE_HIGH = "#e7e8e9";
const OUTLINE = "#c5c6d1";
const GREEN = "#027a48";
const RED = "#b42318";
const AMBER = "#b54708";
const LEFT = 42;
const RIGHT = 553;
const WIDTH = RIGHT - LEFT;
const FOOTER_TOP = 776;
const FOOTER_HEIGHT = 52;
const CONTENT_BOTTOM = FOOTER_TOP - 18;

export const invoiceOfissioCustomTemplate: PdfTemplate<InvoicePdfData> = {
  id: "invoice_ofissio_custom",
  kind: "invoice",
  label: "Invoice Ofissio custom",
  render(data) {
    const doc = new SimplePdfDocument();
    drawBrandHeader(doc, data);
    drawInvoiceHero(doc, data);
    drawPaymentAndWords(doc, data);
    drawItems(doc, data);
    drawTermsTotalsSignature(doc, data);
    drawFooter(doc, data);
    return doc.render();
  },
};

function drawBrandHeader(doc: SimplePdfDocument, data: InvoicePdfData) {
  const badge = paymentBadge(data.paymentStatus);

  doc.text("OFISSIO", LEFT, 32, {
    size: 30,
    font: "bold",
    color: PRIMARY,
  });
  doc.text("WORKWEAR & UNIFORM", LEFT + 2, 64, {
    size: 7.5,
    font: "mono",
    color: MUTED,
  });

  doc.strokeRect(RIGHT - 116, 34, 116, 27, badge.stroke, 0.9);
  doc.text(badge.label, RIGHT - 58, 43, {
    size: 8.5,
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

function drawInvoiceHero(doc: SimplePdfDocument, data: InvoicePdfData) {
  const y = doc.cursorY;
  const heroHeight = 116;

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

  doc.text("INVOICE TO:", LEFT + 34, y + 25, {
    size: 8,
    font: "bold",
    color: YELLOW,
  });
  drawLimitedText(doc, data.companyName || "-", LEFT + 34, y + 43, 236, {
    size: 14,
    lineHeight: 16,
    font: "bold",
    color: "#ffffff",
  }, 2);
  drawLimitedText(
    doc,
    data.companyAddress || data.locationLabel || "-",
    LEFT + 34,
    y + 78,
    226,
    {
      size: 7.6,
      lineHeight: 10,
      color: "#e7e8e9",
    },
    3,
  );
  doc.text(formatPicLine(data), LEFT + 34, y + 100, {
    size: 7.4,
    font: "bold",
    color: YELLOW,
  });

  doc.text("INVOICE", RIGHT - 24, y + 23, {
    size: 35,
    font: "bold",
    color: YELLOW,
    align: "right",
  });
  drawHeroMeta(doc, "Invoice No", data.invoiceNumber, RIGHT - 24, y + 60);
  drawHeroMeta(doc, "Date", formatInvoiceDate(data.invoiceDate), RIGHT - 24, y + 78);
  drawHeroMeta(
    doc,
    "Due",
    data.dueDate ? formatInvoiceDate(data.dueDate) : "-",
    RIGHT - 24,
    y + 96,
  );

  const locationY = y + heroHeight;
  doc.polygon(
    [
      [LEFT, locationY],
      [LEFT + 260, locationY],
      [LEFT + 246, locationY + 22],
      [LEFT, locationY + 22],
    ],
    YELLOW,
  );
  drawLimitedText(doc, data.locationLabel || "Indonesia", LEFT + 18, locationY + 7, 208, {
    size: 7.6,
    lineHeight: 9,
    font: "bold",
    color: PRIMARY,
  }, 1);

  doc.cursorY = locationY + 36;
}

function drawHeroMeta(
  doc: SimplePdfDocument,
  label: string,
  value: string,
  rightX: number,
  y: number,
) {
  doc.text(label.toUpperCase(), rightX - 114, y, {
    size: 6.6,
    font: "mono",
    color: "#aeb4c2",
    align: "left",
  });
  drawLimitedText(doc, value || "-", rightX, y, 112, {
    size: 7.4,
    lineHeight: 8.6,
    font: "bold",
    color: "#ffffff",
    align: "right",
  }, 1);
}

function drawPaymentAndWords(doc: SimplePdfDocument, data: InvoicePdfData) {
  ensureSpace(doc, data, 106);
  const y = doc.cursorY;
  const leftWidth = 238;
  const rightX = LEFT + leftWidth + 22;
  const rightWidth = WIDTH - leftWidth - 22;

  doc.rect(LEFT, y, leftWidth, 84, "#ffffff");
  doc.strokeRect(LEFT, y, leftWidth, 84, SURFACE_HIGH, 0.8);
  doc.text("PAYMENT METHOD", LEFT, y - 12, {
    size: 7.2,
    font: "mono",
    color: MUTED,
  });

  doc.strokeRect(LEFT + 16, y + 20, 44, 44, OUTLINE, 0.8);
  doc.line(LEFT + 24, y + 42, LEFT + 52, y + 42, OUTLINE);
  doc.line(LEFT + 38, y + 28, LEFT + 38, y + 56, OUTLINE);
  doc.text(data.paymentQr ? "QR" : "QR", LEFT + 43, y + 47, {
    size: 8,
    font: "bold",
    color: MUTED,
    align: "center",
  });

  doc.text(paymentMethodLabel(data), LEFT + 74, y + 20, {
    size: 10.4,
    font: "bold",
    color: INK,
  });
  doc.rect(LEFT + 74, y + 38, 108, 20, PRIMARY);
  doc.text(data.isPaymentLive ? "Bayar via iPaymu" : "Payment Link", LEFT + 128, y + 44, {
    size: 7.2,
    font: "bold",
    color: "#ffffff",
    align: "center",
  });
  drawLimitedText(doc, data.paymentLink || "Payment link tersedia setelah payment aktif.", LEFT + 74, y + 66, 146, {
    size: 6.7,
    lineHeight: 8.2,
    color: MUTED,
  }, 2);

  doc.rect(rightX, y, rightWidth, 84, SURFACE);
  doc.rect(rightX, y, 6, 84, YELLOW);
  doc.strokeRect(rightX, y, rightWidth, 84, SURFACE_HIGH, 0.8);
  doc.text("AMOUNT IN WORDS", rightX + 22, y + 18, {
    size: 7.2,
    font: "mono",
    color: MUTED,
  });
  drawLimitedText(doc, data.amountInWords || "-", rightX + 22, y + 37, rightWidth - 44, {
    size: 10.4,
    lineHeight: 12.6,
    font: "bold",
    color: PRIMARY,
  }, 3);
  doc.text(`Valid until: ${data.paymentExpiry ? formatInvoiceDate(data.paymentExpiry) : "-"}`, rightX + 22, y + 72, {
    size: 7.1,
    color: MUTED,
  });

  doc.cursorY = y + 106;
}

function drawItems(doc: SimplePdfDocument, data: InvoicePdfData) {
  ensureSpace(doc, data, 92);
  const widths = [34, 236, 86, 46, 109];
  const aligns: Array<"left" | "center" | "right"> = [
    "center",
    "left",
    "right",
    "center",
    "right",
  ];
  let y = drawTableHeader(doc, doc.cursorY, widths, aligns);

  data.items.forEach((item, index) => {
    const description = compactDescription(item.description);
    const rowHeight = calculateItemRowHeight(description, widths[1] ?? 236);
    if (y + rowHeight > CONTENT_BOTTOM) {
      doc.addPage();
      drawMiniHeader(doc, data);
      y = drawTableHeader(doc, doc.cursorY, widths, aligns, "ITEM DETAILS (CONT.)");
    }

    y += drawItemRow(doc, {
      y,
      widths,
      aligns,
      values: [
        String(index + 1),
        description,
        formatRupiah(item.unitPrice),
        String(item.qty),
        formatRupiah(item.total),
      ],
      rowHeight,
    });
  });

  doc.cursorY = y + 20;
}

function drawTableHeader(
  doc: SimplePdfDocument,
  y: number,
  widths: number[],
  aligns: Array<"left" | "center" | "right">,
  title = "ITEM DETAILS",
) {
  doc.text(title, LEFT, y, {
    size: 8,
    font: "mono",
    color: PRIMARY,
  });

  const headerY = y + 24;
  const labels = ["No", "Description", "Harga Satuan", "Qty", "Total"];
  let x = LEFT;
  labels.forEach((label, index) => {
    const width = widths[index] ?? 60;
    const align = aligns[index] ?? "left";
    doc.text(label.toUpperCase(), columnTextX(x, width, align), headerY, {
      size: 6.8,
      font: "bold",
      color: PRIMARY,
      align,
    });
    x += width;
  });
  doc.line(LEFT, headerY + 15, RIGHT, headerY + 15, PRIMARY);
  return headerY + 24;
}

function drawItemRow(
  doc: SimplePdfDocument,
  input: {
    y: number;
    widths: number[];
    aligns: Array<"left" | "center" | "right">;
    values: string[];
    rowHeight: number;
  },
) {
  doc.rect(LEFT, input.y, WIDTH, input.rowHeight, SURFACE_LOW);
  doc.strokeRect(LEFT, input.y, WIDTH, input.rowHeight, SURFACE_HIGH, 0.8);

  let x = LEFT;
  input.values.forEach((value, index) => {
    const width = input.widths[index] ?? 60;
    const align = input.aligns[index] ?? "left";
    const size = index === 1 ? 8.1 : 7.7;
    const lineHeight = index === 1 ? 10.2 : 9.4;
    const maxLines = index === 1 ? 4 : 2;
    drawLimitedText(doc, value, columnTextX(x, width, align), input.y + 15, width - 14, {
      size,
      lineHeight,
      font: index === 1 || index === 4 ? "bold" : "regular",
      color: index === 4 ? PRIMARY : INK,
      align,
    }, maxLines);
    x += width;
  });

  return input.rowHeight;
}

function drawTermsTotalsSignature(doc: SimplePdfDocument, data: InvoicePdfData) {
  ensureSpace(doc, data, 196);
  const y = doc.cursorY;
  drawTerms(doc, data, LEFT, y);
  drawSummary(doc, data, RIGHT - 244, y);
  drawSignature(doc, data, RIGHT - 218, y + 120);
  doc.cursorY = y + 196;
}

function drawTerms(doc: SimplePdfDocument, data: InvoicePdfData, x: number, y: number) {
  doc.text("TERMS & CONDITIONS", x, y, {
    size: 7.6,
    font: "mono",
    color: PRIMARY,
  });

  let ty = y + 22;
  data.terms.slice(0, 4).forEach((term) => {
    ty += drawLimitedText(doc, `- ${term}`, x, ty, 252, {
      size: 7.4,
      lineHeight: 9.8,
      color: "#344054",
    }, 3);
    ty += 4;
  });

  doc.text("Thank you for your business.", x, Math.min(ty + 13, y + 146), {
    size: 11,
    font: "bold",
    color: PRIMARY,
  });
}

function drawSummary(doc: SimplePdfDocument, data: InvoicePdfData, x: number, y: number) {
  const rowRight = x + 244;
  summaryRow(doc, "Sub-total", data.subtotal, x, y + 2, rowRight);
  summaryRow(doc, "Kode Unik", data.uniqueCode, x, y + 22, rowRight);
  summaryRow(doc, "DPP", data.dpp, x, y + 42, rowRight);
  summaryRow(doc, `PPN ${data.taxRate}%`, data.taxTotal, x, y + 62, rowRight);
  summaryRow(doc, "Shipping", data.shippingTotal, x, y + 82, rowRight);

  doc.rect(x, y + 102, 82, 36, YELLOW);
  doc.rect(x + 82, y + 102, 162, 36, PRIMARY);
  doc.text("TOTAL", x + 18, y + 115, {
    size: 9,
    font: "bold",
    color: PRIMARY,
  });
  doc.text(formatRupiah(data.grandTotal), x + 232, y + 114, {
    size: 12.6,
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
  doc.text(label.toUpperCase(), x, y, {
    size: 7,
    font: "mono",
    color: MUTED,
  });
  doc.text(formatRupiah(value), rightX, y, {
    size: 8.2,
    font: "bold",
    color: INK,
    align: "right",
  });
  doc.line(x, y + 12, rightX, y + 12, SURFACE_HIGH);
}

function drawSignature(doc: SimplePdfDocument, data: InvoicePdfData, x: number, y: number) {
  doc.text("Authorized Signature", x + 109, y, {
    size: 7.1,
    color: MUTED,
    align: "center",
  });
  doc.line(x + 28, y + 50, x + 190, y + 50, OUTLINE);
  drawLimitedText(doc, data.signerName || "-", x + 109, y + 61, 174, {
    size: 9.3,
    lineHeight: 11,
    font: "bold",
    color: INK,
    align: "center",
  }, 1);
  doc.text((data.signerTitle || "OFISSIO").toUpperCase(), x + 109, y + 76, {
    size: 6.8,
    font: "mono",
    color: MUTED,
    align: "center",
  });
}

function drawFooter(doc: SimplePdfDocument, data: InvoicePdfData) {
  doc.rect(LEFT, FOOTER_TOP, WIDTH, FOOTER_HEIGHT, PRIMARY);
  doc.polygon(
    [
      [LEFT, FOOTER_TOP],
      [LEFT + 72, FOOTER_TOP],
      [LEFT + 52, FOOTER_TOP + FOOTER_HEIGHT],
      [LEFT, FOOTER_TOP + FOOTER_HEIGHT],
    ],
    YELLOW,
  );
  doc.text("OFISSIO", LEFT + 31, FOOTER_TOP + 18, {
    size: 11,
    font: "bold",
    color: PRIMARY,
    align: "center",
  });
  doc.text("WORKWEAR", LEFT + 31, FOOTER_TOP + 32, {
    size: 5.8,
    font: "mono",
    color: PRIMARY,
    align: "center",
  });

  footerContact(doc, "TEL", data.contactTel, LEFT + 136, FOOTER_TOP + 14);
  footerContact(doc, "WEB", data.contactWeb, LEFT + 280, FOOTER_TOP + 14);
  footerContact(doc, "EMAIL", data.contactEmail, LEFT + 402, FOOTER_TOP + 14);
}

function footerContact(
  doc: SimplePdfDocument,
  label: string,
  value: string,
  x: number,
  y: number,
) {
  doc.text(label, x, y, {
    size: 6.8,
    font: "mono",
    color: YELLOW,
  });
  drawLimitedText(doc, value || "-", x, y + 16, 112, {
    size: 7.2,
    lineHeight: 9,
    color: "#ffffff",
  }, 2);
}

function drawMiniHeader(doc: SimplePdfDocument, data: InvoicePdfData) {
  doc.text("OFISSIO", LEFT, 32, {
    size: 16,
    font: "bold",
    color: PRIMARY,
  });
  doc.text(`Invoice ${data.invoiceNumber}`, RIGHT, 35, {
    size: 7.2,
    color: MUTED,
    align: "right",
  });
  doc.line(LEFT, 58, RIGHT, 58, SURFACE_HIGH);
  doc.cursorY = 82;
}

function ensureSpace(doc: SimplePdfDocument, data: InvoicePdfData, requiredHeight: number) {
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

function calculateItemRowHeight(description: string, descriptionWidth: number) {
  const lineCount = Math.min(4, wrapText(description, descriptionWidth - 14, 8.1).length);
  return Math.max(52, 22 + lineCount * 10.2);
}

function columnTextX(x: number, width: number, align: "left" | "center" | "right") {
  if (align === "right") return x + width - 8;
  if (align === "center") return x + width / 2;
  return x + 8;
}

function compactDescription(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 210 ? `${normalized.slice(0, 207)}...` : normalized;
}

function formatPicLine(data: InvoicePdfData) {
  const pic = [data.picName, data.picPhone].filter(Boolean).join(" / ");
  return pic ? `PIC: ${pic}` : "PIC: -";
}

function paymentMethodLabel(data: InvoicePdfData) {
  if (data.paymentProvider === "ipaymu") return "Bayar via iPaymu";
  if (data.paymentProvider) return data.paymentProvider;
  return "Payment pending";
}

function paymentBadge(status: InvoicePdfData["paymentStatus"]) {
  if (status === "paid" || status === "payment_received") {
    return { label: "LUNAS", stroke: "#abefc6", color: GREEN };
  }
  if (status === "cancelled") {
    return { label: "DIBATALKAN", stroke: OUTLINE, color: MUTED };
  }
  if (status === "failed") {
    return { label: "GAGAL", stroke: "#fecdca", color: RED };
  }
  return { label: "BELUM LUNAS", stroke: "#fedf89", color: AMBER };
}
