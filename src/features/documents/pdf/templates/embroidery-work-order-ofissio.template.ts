import "server-only";

import { formatInvoiceDate } from "../../document.utils";
import type { EmbroideryWorkOrderPdfData } from "../../document.types";
import { SimplePdfDocument } from "../pdf-renderer";
import type { PdfTemplate } from "../pdf.types";

const NAVY = "#061a56";
const NAVY_SOFT = "#edf1fb";
const YELLOW = "#f6c900";
const INK = "#172033";
const MUTED = "#667085";
const LINE = "#d8deea";
const SURFACE = "#f6f8fc";
const WHITE = "#ffffff";
const LEFT = 42;
const RIGHT = 553;
const WIDTH = RIGHT - LEFT;
const BOTTOM = 774;

export const embroideryWorkOrderOfissioTemplate: PdfTemplate<EmbroideryWorkOrderPdfData> = {
  id: "embroidery_work_order_ofissio",
  kind: "embroidery_work_order",
  label: "Bordir Work Order Ofissio",
  render(data) {
    const doc = new SimplePdfDocument();
    drawHeader(doc, data);
    drawJobOverview(doc, data);
    drawItems(doc, data);
    drawQualityChecklist(doc, data);
    drawApproval(doc, data);
    drawFooter(doc, data);
    return doc.render();
  },
};

function drawHeader(doc: SimplePdfDocument, data: EmbroideryWorkOrderPdfData) {
  doc.rect(LEFT, 30, 6, 44, YELLOW);
  doc.text("OFISSIO", LEFT + 17, 30, { size: 26, font: "bold", color: NAVY });
  doc.text("WORKWEAR  &  UNIFORM", LEFT + 19, 59, { size: 6.2, font: "mono", color: MUTED });

  doc.rect(RIGHT - 92, 31, 92, 19, NAVY);
  doc.text("INTERNAL", RIGHT - 46, 36, { size: 6.2, font: "bold", color: WHITE, align: "center" });
  doc.text(`Terbit ${formatInvoiceDate(data.createdAt)}`, RIGHT, 59, {
    size: 6.5,
    color: MUTED,
    align: "right",
  });
  doc.line(LEFT, 86, RIGHT, 86, LINE);

  const titleY = 102;
  doc.text("BORDIR", LEFT, titleY, { size: 12, font: "bold", color: YELLOW });
  doc.text("WORK ORDER", LEFT, titleY + 18, { size: 24, font: "bold", color: NAVY });
  doc.text("Surat perintah kerja untuk proses aplikasi bordir", LEFT, titleY + 43, {
    size: 7.2,
    color: MUTED,
  });
  doc.rect(RIGHT - 108, titleY + 4, 108, 38, NAVY_SOFT);
  doc.text("ROUTING", RIGHT - 96, titleY + 12, { size: 5.8, font: "mono", color: MUTED });
  doc.text("CUS / BORDIR", RIGHT - 12, titleY + 24, { size: 8.5, font: "bold", color: NAVY, align: "right" });

  const y = 156;
  doc.rect(LEFT, y, WIDTH, 64, NAVY);
  doc.rect(LEFT, y, 7, 64, YELLOW);
  doc.text("NOMOR BORDIR WORK ORDER", LEFT + 22, y + 14, { size: 6, font: "mono", color: "#b8c4e7" });
  doc.text(data.workOrderNumber, LEFT + 22, y + 31, { size: 12.5, font: "bold", color: WHITE });
  doc.text("PELANGGAN", LEFT + 22, y + 52, { size: 5.8, font: "mono", color: "#b8c4e7" });
  doc.text(data.companyName, LEFT + 84, y + 51, { size: 7.4, font: "bold", color: YELLOW });
  doc.text("DOKUMEN TERKENDALI", RIGHT - 18, y + 17, { size: 6.2, font: "bold", color: YELLOW, align: "right" });
  doc.text("Gunakan revisi terbaru", RIGHT - 18, y + 36, { size: 6.7, color: "#dfe5f5", align: "right" });
  doc.text("sebelum pekerjaan dimulai", RIGHT - 18, y + 50, { size: 6.7, color: "#dfe5f5", align: "right" });
  doc.cursorY = 226;
}

function drawJobOverview(doc: SimplePdfDocument, data: EmbroideryWorkOrderPdfData) {
  sectionTitle(doc, "RINGKASAN PERINTAH KERJA", "01");
  const y = doc.cursorY;
  const gap = 8;
  const cellWidth = (WIDTH - gap) / 2;
  const rows: Array<[[string, string], [string, string]]> = [
    [
      ["PROCESS ORDER", data.processOrderNumber],
      ["SALES ORDER", data.orderNumber],
    ],
    [
      ["DEADLINE", data.deadline ? formatInvoiceDate(data.deadline) : "Belum ditentukan"],
      ["PRIORITAS / PIC", `${data.priority.toUpperCase()} / ${data.assignedTeam ?? "Tim Bordir"}`],
    ],
  ];
  rows.forEach((row, rowIndex) => {
    row.forEach(([label, value], columnIndex) => {
      infoCell(doc, LEFT + columnIndex * (cellWidth + gap), y + rowIndex * 40, cellWidth, label, value);
    });
  });
  doc.text(`Referensi quotation: ${data.quotationNumber ?? "-"}`, LEFT, y + 88, { size: 6.8, color: MUTED });
  doc.cursorY = y + 98;
}

function drawItems(doc: SimplePdfDocument, data: EmbroideryWorkOrderPdfData) {
  data.items.forEach((item, itemIndex) => {
    ensurePage(doc, data, 136);
    sectionTitle(doc, `DETAIL BARANG ${itemIndex + 1}`, String(itemIndex + 2).padStart(2, "0"));
    const y = doc.cursorY;

    doc.rect(LEFT, y, WIDTH, 49, SURFACE);
    doc.rect(LEFT, y, 5, 49, NAVY);
    doc.text(item.productName, LEFT + 17, y + 10, { size: 10, font: "bold", color: NAVY });
    doc.text(`SKU ${item.sku}   |   ${item.selectedColor}`, LEFT + 17, y + 29, { size: 7.2, color: MUTED });
    doc.text(`${item.totalQty}`, RIGHT - 18, y + 8, { size: 17, font: "bold", color: NAVY, align: "right" });
    doc.text("PCS", RIGHT - 18, y + 29, { size: 6.3, font: "mono", color: MUTED, align: "right" });

    doc.text("SIZE MATRIX", LEFT, y + 65, { size: 6.2, font: "mono", color: MUTED });
    doc.text(item.sizeSummary || "-", LEFT + 79, y + 65, { size: 7.7, font: "bold", color: INK });
    doc.text("INSTRUKSI", LEFT, y + 83, { size: 6.2, font: "mono", color: MUTED });
    doc.text(item.instruction || "Ikuti artwork dan placement yang telah disetujui.", LEFT + 79, y + 83, { size: 7.5, color: INK });
    doc.cursorY = y + 105;

    if (item.placements.length === 0) {
      const warningY = doc.cursorY;
      doc.rect(LEFT, warningY, WIDTH, 31, "#fff8dc");
      doc.rect(LEFT, warningY, 5, 31, YELLOW);
      doc.text("Placement belum tersedia. Konfirmasi artwork sebelum pekerjaan dimulai.", LEFT + 17, warningY + 10, { size: 7.5, font: "bold", color: "#755600" });
      doc.cursorY += 43;
      return;
    }

    item.placements.forEach((placement, placementIndex) => {
      ensurePage(doc, data, 73);
      const py = doc.cursorY;
      doc.strokeRect(LEFT, py, WIDTH, 70, LINE, 0.8);
      doc.rect(LEFT, py, 39, 60, NAVY_SOFT);
      doc.text(String(placementIndex + 1).padStart(2, "0"), LEFT + 19.5, py + 20, { size: 12, font: "bold", color: NAVY, align: "center" });
      doc.text("TITIK", LEFT + 19.5, py + 38, { size: 5.8, font: "mono", color: MUTED, align: "center" });

      doc.text(placement.zone.toUpperCase(), LEFT + 53, py + 10, { size: 8.5, font: "bold", color: NAVY });
      doc.text(`${placement.technique}   |   ${placement.widthCm} x ${placement.heightCm} cm   |   Rotasi ${placement.rotation}°`, LEFT + 53, py + 27, { size: 7.2, color: INK });
      doc.text("ARTWORK", LEFT + 53, py + 44, { size: 5.7, font: "mono", color: MUTED });
      doc.text(placement.logoFileName || "Belum dilampirkan", LEFT + 101, py + 43, { size: 6.8, font: "bold", color: NAVY });
      doc.strokeRect(RIGHT - 69, py + 8, 56, 54, LINE, 0.7);
      doc.text("PREVIEW", RIGHT - 41, py + 23, { size: 5.7, font: "mono", color: MUTED, align: "center" });
      doc.text("ARTWORK", RIGHT - 41, py + 36, { size: 6.5, font: "bold", color: NAVY, align: "center" });
      doc.text("akan tampil di sini", RIGHT - 41, py + 49, { size: 4.9, color: MUTED, align: "center" });
      if (placement.notes) {
        doc.text(`Catatan: ${placement.notes}`, LEFT + 53, py + 58, { size: 6.2, color: MUTED });
      }
      doc.cursorY = py + 82;
    });
  });
}

function drawQualityChecklist(doc: SimplePdfDocument, data: EmbroideryWorkOrderPdfData) {
  ensurePage(doc, data, 121);
  sectionTitle(doc, "KONTROL PRODUKSI & QC", "QC");
  const checks = [
    "Artwork sesuai approval",
    "Posisi & ukuran sesuai",
    "Warna benang sesuai",
    "Jumlah & size matrix sesuai",
    "Material bersih dan tidak rusak",
    "Hasil akhir siap packing",
  ];
  const startY = doc.cursorY;
  checks.forEach((label, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = LEFT + column * 256;
    const y = startY + row * 20;
    doc.strokeRect(x, y, 12, 12, NAVY, 0.8);
    doc.text(label, x + 20, y + 2.5, { size: 7.1, color: INK });
  });
  doc.cursorY = startY + 55;
}

function drawApproval(doc: SimplePdfDocument, data: EmbroideryWorkOrderPdfData) {
  ensurePage(doc, data, 122);
  sectionTitle(doc, "OTORISASI & SERAH TERIMA", "OK");
  const y = doc.cursorY;
  const gap = 8;
  const cardWidth = (WIDTH - gap * 2) / 3;
  ["ADMIN OFISSIO", "TIM BORDIR", "QUALITY CONTROL"].forEach((label, index) => {
    const x = LEFT + index * (cardWidth + gap);
    doc.strokeRect(x, y, cardWidth, 62, LINE, 0.8);
    doc.rect(x, y, cardWidth, 21, SURFACE);
    doc.text(label, x + 10, y + 7, { size: 6.2, font: "bold", color: NAVY });
    doc.line(x + 13, y + 43, x + cardWidth - 13, y + 43, LINE);
    doc.text("Nama / Tanggal / Paraf", x + cardWidth / 2, y + 49, { size: 5.8, color: MUTED, align: "center" });
  });
  doc.text("CATATAN", LEFT, y + 75, { size: 6.2, font: "mono", color: MUTED });
  doc.text(data.notes || "Tidak ada catatan tambahan.", LEFT + 52, y + 75, { size: 7, color: INK });
  doc.cursorY = y + 94;
}

function infoCell(doc: SimplePdfDocument, x: number, y: number, width: number, label: string, value: string) {
  doc.rect(x, y, width, 33, SURFACE);
  doc.text(label, x + 11, y + 8, { size: 5.9, font: "mono", color: MUTED });
  doc.text(value, x + 11, y + 19, { size: 7.7, font: "bold", color: INK });
}

function sectionTitle(doc: SimplePdfDocument, title: string, index: string) {
  doc.rect(LEFT, doc.cursorY, 22, 16, NAVY);
  doc.text(index, LEFT + 11, doc.cursorY + 4.5, { size: 6, font: "bold", color: YELLOW, align: "center" });
  doc.text(title, LEFT + 31, doc.cursorY + 4, { size: 7.2, font: "bold", color: NAVY });
  doc.line(LEFT + 31, doc.cursorY + 16, RIGHT, doc.cursorY + 16, YELLOW);
  doc.cursorY += 28;
}

function ensurePage(doc: SimplePdfDocument, data: EmbroideryWorkOrderPdfData, height: number) {
  if (doc.cursorY + height <= BOTTOM) return;
  drawFooter(doc, data);
  doc.addPage();
  doc.rect(LEFT, 31, 5, 28, YELLOW);
  doc.text("BORDIR WORK ORDER", LEFT + 15, 32, { size: 10, font: "bold", color: NAVY });
  doc.text(data.workOrderNumber, RIGHT, 34, { size: 7.2, font: "bold", color: NAVY, align: "right" });
  doc.line(LEFT, 70, RIGHT, 70, LINE);
  doc.cursorY = 88;
}

function drawFooter(doc: SimplePdfDocument, data: EmbroideryWorkOrderPdfData) {
  doc.line(LEFT, 793, RIGHT, 793, NAVY);
  doc.text("OFISSIO  /  INTERNAL PRODUCTION DOCUMENT", LEFT, 804, { size: 5.8, font: "bold", color: NAVY });
  doc.text(`${data.contactEmail}  |  ${data.contactWeb}`, LEFT, 817, { size: 5.8, color: MUTED });
  doc.text(`${data.locationLabel}  |  ${formatInvoiceDate(data.generatedAt)}`, RIGHT, 804, { size: 5.8, color: MUTED, align: "right" });
  doc.text("Gunakan revisi terbaru sebelum pekerjaan dimulai.", RIGHT, 817, { size: 5.8, font: "bold", color: NAVY, align: "right" });
}
