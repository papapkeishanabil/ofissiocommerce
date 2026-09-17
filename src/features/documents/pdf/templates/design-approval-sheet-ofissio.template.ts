import "server-only";

import { formatInvoiceDate } from "../../document.utils";
import type {
  DesignApprovalSheetArea,
  DesignApprovalSheetFigure,
  DesignApprovalSheetGarment,
  DesignApprovalSheetPdfData,
} from "../../document.types";
import { SimplePdfDocument, pdfTableRow } from "../pdf-renderer";
import type { PdfTemplate } from "../pdf.types";

export const DESIGN_APPROVAL_SHEET_RENDERER_VERSION = "das-ofissio-v1";

const N = "#061a56";
const Y = "#f6c900";
const I = "#172033";
const M = "#667085";
const L = "#d8deea";
const S = "#f6f8fc";
const W = "#ffffff";
const RED = "#dc2626";
const AMBER_BG = "#fef3c7";

const X = 36;
const R = 805.89;
const WIDTH = R - X;

/** Posisi perkiraan zona pada figur garment (fraksi lebar/tinggi kotak figur). */
const ZONE_POSITION: Record<string, { fx: number; fy: number; side: "front" | "back" }> = {
  left_chest: { fx: 0.34, fy: 0.3, side: "front" },
  right_chest: { fx: 0.66, fy: 0.3, side: "front" },
  left_sleeve: { fx: 0.13, fy: 0.38, side: "front" },
  right_sleeve: { fx: 0.87, fy: 0.38, side: "front" },
  upper_back: { fx: 0.5, fy: 0.22, side: "back" },
  middle_back: { fx: 0.5, fy: 0.42, side: "back" },
  center_back: { fx: 0.5, fy: 0.42, side: "back" },
};

export const designApprovalSheetOfissioTemplate: PdfTemplate<DesignApprovalSheetPdfData> = {
  id: "design_approval_sheet_ofissio",
  kind: "design_approval_sheet",
  label: "Lembar Approval Desain Ofissio",
  render(data) {
    const doc = new SimplePdfDocument({ orientation: "landscape" });
    const total = data.garments.length;
    data.garments.forEach((garment, index) => {
      if (index > 0) doc.addPage();
      renderGarmentPage(doc, data, garment, index + 1, total);
    });
    return doc.render();
  },
};

function renderGarmentPage(
  doc: SimplePdfDocument,
  data: DesignApprovalSheetPdfData,
  garment: DesignApprovalSheetGarment,
  pageNumber: number,
  total_pages: number,
) {
  header(doc, data, garment);
  metaGrid(doc, garment);
  figures(doc, garment);
  specificationTable(doc, garment);
  areaTable(doc, garment);
  sizeMatrix(doc, garment);
  adjustmentTable(doc, garment);
  signatureBlocks(doc, data);
  footer(doc, data, pageNumber, total_pages);
}

function header(
  doc: SimplePdfDocument,
  data: DesignApprovalSheetPdfData,
  garment: DesignApprovalSheetGarment,
) {
  doc.rect(X, 24, 6, 30, Y);
  doc.text("OFISSIO", X + 15, 26, { size: 19, font: "bold", color: N });
  doc.text("WORKWEAR & UNIFORM", X + 17, 46, { size: 5.5, font: "mono", color: M });

  doc.text("LEMBAR APPROVAL DESAIN", 330, 28, { size: 13, font: "bold", color: N });
  doc.text(
    `Design Approval Sheet — ${garment.itemCode}, ${garment.garmentType}`,
    330,
    46,
    { size: 6.5, color: M },
  );

  doc.rect(R - 168, 24, 168, 30, N);
  doc.text("NO. DOKUMEN", R - 158, 30, { size: 5.4, font: "mono", color: "#b8c4e7" });
  doc.text(data.documentNumber, R - 158, 40, { size: 8.5, font: "bold", color: W });

  const revision = `REVISI ${String(data.revisionNo).padStart(2, "0")}`;
  const revisionDate = data.revisedAt
    ? `, ${formatInvoiceDate(data.revisedAt)}`
    : data.revisionNo > 0
      ? `, ${formatInvoiceDate(data.generatedAt)}`
      : "";
  doc.rect(X, 62, 120, 16, data.revisionNo > 0 ? RED : S);
  doc.text(
    revision + (data.revisionNo > 0 ? revisionDate : ""),
    X + 60,
    66.5,
    {
      size: 6.4,
      font: "bold",
      color: data.revisionNo > 0 ? W : M,
      align: "center",
    },
  );
  const statusLabel = data.approvalStatus === "approved" ? "DISETUJUI" : "MENUNGGU APPROVAL";
  doc.rect(X + 128, 62, 150, 16, data.approvalStatus === "approved" ? "#ecfdf5" : AMBER_BG);
  doc.text(statusLabel, X + 203, 66.5, {
    size: 6.4,
    font: "bold",
    color: data.approvalStatus === "approved" ? "#047857" : "#92400e",
    align: "center",
  });
  doc.line(X, 86, R, 86, L);
}

function metaGrid(doc: SimplePdfDocument, garment: DesignApprovalSheetGarment) {
  const columns = [188, 188, 188, 205];
  const rows: Array<Array<[string, string]>> = [
    [
      ["PROYEK", truncate(projectValue(garment), 42)],
      ["KLIEN", truncate(garment.clientLabel, 42)],
      ["NO. PO / REFERENSI", garment.poNumber ?? "-"],
      ["KODE ITEM", garment.itemCode],
    ],
    [
      ["BAHAN", garment.materialLabel ?? "Menunggu konfirmasi"],
      ["WARNA", garment.colorLabel ?? "-"],
      ["DEADLINE", garment.deadline ? formatInvoiceDate(garment.deadline) : "-"],
      ["JUMLAH TOTAL", `${garment.totalQuantity} pcs`],
    ],
  ];
  let y = 92;
  rows.forEach((row) => {
    let x = X;
    row.forEach((cell, index) => {
      doc.rect(x, y, columns[index]! - 4, 22, S);
      doc.text(cell[0], x + 8, y + 4.5, { size: 5.2, font: "mono", color: M });
      doc.text(cell[1] || "-", x + 8, y + 12, { size: 7.4, font: "bold", color: I });
      x += columns[index]!;
    });
    y += 24;
  });
}

function projectValue(garment: DesignApprovalSheetGarment) {
  return garment.projectName || garment.garmentType;
}

function figures(doc: SimplePdfDocument, garment: DesignApprovalSheetGarment) {
  const boxWidth = 182;
  const boxHeight = 158;
  const top = 148;
  drawFigure(doc, garment.figures.front, "front", X, top, boxWidth, boxHeight, garment.areas);
  drawFigure(doc, garment.figures.back, "back", X + boxWidth + 12, top, boxWidth, boxHeight, garment.areas);

  // Legenda area bordir di bawah figur.
  let legendX = X;
  const legendY = top + boxHeight + 8;
  garment.areas.slice(0, 5).forEach((area) => {
    const text = `${area.label} — ${area.zoneLabel} ${area.widthCm}×${area.heightCm} cm`;
    const width = text.length * 3.4 + 22;
    if (legendX + width > X + boxWidth * 2 + 12) return;
    doc.rect(legendX, legendY, 11, 11, RED);
    doc.text(area.label, legendX + 5.5, legendY + 2.5, {
      size: 5.6,
      font: "bold",
      color: W,
      align: "center",
    });
    doc.text(text, legendX + 15, legendY + 2.5, { size: 5.8, color: I });
    legendX += width;
  });
}

function drawFigure(
  doc: SimplePdfDocument,
  figure: DesignApprovalSheetFigure | null,
  side: "front" | "back",
  x: number,
  y: number,
  width: number,
  height: number,
  areas: DesignApprovalSheetArea[],
) {
  doc.strokeRect(x, y, width, height, L, 1);
  doc.text(side === "front" ? "DEPAN" : "BELAKANG", x + width / 2, y + 5, {
    size: 5.6,
    font: "bold",
    color: M,
    align: "center",
  });

  const drawn =
    figure?.bytes && doc.image(figure.bytes, x + 4, y + 14, width - 8, height - 18);
  if (!drawn) {
    // Placeholder vektor: siluet garment sederhana.
    doc.rect(x + width * 0.18, y + 22, width * 0.64, height * 0.68, S);
    doc.polygon(
      [
        [x + width * 0.3, y + 22],
        [x + width * 0.18, y + 32],
        [x + width * 0.24, y + 44],
        [x + width * 0.3, y + 40],
        [x + width * 0.3, y + 84],
        [x + width * 0.7, y + 84],
        [x + width * 0.7, y + 40],
        [x + width * 0.76, y + 44],
        [x + width * 0.82, y + 32],
        [x + width * 0.7, y + 22],
      ],
      S,
    );
    doc.strokeRect(x + width * 0.18, y + 22, width * 0.64, height * 0.68, L, 0.8);
    doc.text("Foto mockup belum diunggah", x + width / 2, y + height - 14, {
      size: 5.4,
      color: M,
      align: "center",
    });
  }

  // Overlay kotak area bordir untuk zona pada sisi figur ini.
  areas.forEach((area) => {
    const position = ZONE_POSITION[area.zone];
    if (!position || position.side !== side) return;
    const boxWidth = Math.max(16, Math.min(width * 0.5, (area.widthCm / 30) * width));
    const boxHeight = Math.max(12, (area.heightCm / area.widthCm) * boxWidth);
    const cx = x + position.fx * width + (area.offsetXCm ? (area.offsetXCm / 60) * width : 0);
    const cy = y + 14 + position.fy * (height - 18) + (area.offsetYCm ? (area.offsetYCm / 60) * height : 0);
    const left = Math.min(Math.max(cx - boxWidth / 2, x + 4), x + width - boxWidth - 4);
    const top = Math.min(Math.max(cy - boxHeight / 2, y + 16), y + height - boxHeight - 4);
    doc.strokeRect(left, top, boxWidth, boxHeight, RED, 1.2);
    doc.rect(left, top, 11, 11, RED);
    doc.text(area.label, left + 5.5, top + 2.5, {
      size: 5.6,
      font: "bold",
      color: W,
      align: "center",
    });
  });
}

function specificationTable(doc: SimplePdfDocument, garment: DesignApprovalSheetGarment) {
  const x = X + 182 * 2 + 12 + 14;
  const width = R - x;
  doc.text("SPESIFIKASI KONSTRUKSI", x, 148, { size: 6.2, font: "bold", color: N });
  let y = 156;
  y += pdfTableRow({
    doc,
    x,
    y,
    widths: [width * 0.38, width * 0.38, width * 0.24],
    values: ["Detail", "Nilai", "Ukuran"],
    header: true,
  });
  const rows = garment.specifications.slice(0, 6);
  rows.forEach((specification) => {
    const highlight = specification.status === "recommendation" ? AMBER_BG : undefined;
    y += pdfTableRow({
      doc,
      x,
      y,
      widths: [width * 0.38, width * 0.38, width * 0.24],
      values: [
        specification.label,
        specification.value,
        specification.measurements ?? "-",
      ],
      fill: highlight,
    });
  });
  const hidden = garment.specifications.length - rows.length;
  if (hidden > 0) {
    doc.text(`+${hidden} detail lainnya`, x, y + 3, { size: 5.6, color: M });
    y += 12;
  }
  if (garment.sizeNotes) {
    doc.text(`Catatan ukuran: ${truncate(garment.sizeNotes, 90)}`, x, y + 4, {
      size: 5.8,
      color: I,
    });
  }
}

function areaTable(doc: SimplePdfDocument, garment: DesignApprovalSheetGarment) {
  const x = X + 182 * 2 + 12 + 14;
  const width = R - x;
  const top = 262;
  doc.text("BORDIR & AREA LOGO", x, top, { size: 6.2, font: "bold", color: N });
  let y = top + 8;
  y += pdfTableRow({
    doc,
    x,
    y,
    widths: [width * 0.1, width * 0.42, width * 0.24, width * 0.24],
    values: ["Area", "Posisi", "Ukuran (cm)", "Teknik"],
    header: true,
  });
  const rows = garment.areas.slice(0, 5);
  rows.forEach((area) => {
    y += pdfTableRow({
      doc,
      x,
      y,
      widths: [width * 0.1, width * 0.42, width * 0.24, width * 0.24],
      values: [
        area.label,
        [area.positionNote ?? area.zoneLabel, area.logoFileName ? `Logo: ${area.logoFileName}` : null, area.notes]
          .filter(Boolean)
          .join(", "),
        `${area.widthCm} × ${area.heightCm}`,
        area.techniqueLabel,
      ],
    });
  });
  if (rows.length === 0) {
    y += pdfTableRow({
      doc,
      x,
      y,
      widths: [width * 0.1, width * 0.42, width * 0.24, width * 0.24],
      values: ["-", "Tidak ada area bordir pada item ini", "-", "-"],
    });
  }
}

function sizeMatrix(doc: SimplePdfDocument, garment: DesignApprovalSheetGarment) {
  const top = 320;
  doc.text("JUMLAH PER UKURAN", X, top, { size: 6.2, font: "bold", color: N });
  const sizes = garment.allSizes.slice(0, 9);
  const firstColumn = 64;
  const totalColumn = 58;
  const sizeColumn = (WIDTH - firstColumn - totalColumn) / Math.max(1, sizes.length);
  const widths = [firstColumn, ...sizes.map(() => sizeColumn), totalColumn];
  let y = top + 8;
  y += pdfTableRow({
    doc,
    x: X,
    y,
    widths,
    values: ["Kelompok", ...sizes, "Total"],
    header: true,
    aligns: ["left", ...sizes.map(() => "center" as const), "right" as const],
  });
  garment.sizeRows.forEach((row) => {
    y += pdfTableRow({
      doc,
      x: X,
      y,
      widths,
      values: [row.group, ...row.cells.map((cell) => String(cell.quantity || "")), String(row.total)],
      aligns: ["left", ...sizes.map(() => "center" as const), "right" as const],
    });
  });
  y += pdfTableRow({
    doc,
    x: X,
    y,
    widths,
    values: ["TOTAL", ...sizes.map(() => ""), String(garment.totalQuantity)],
    fill: "#edf1fb",
    aligns: ["left", ...sizes.map(() => "center" as const), "right" as const],
  });
}

function adjustmentTable(doc: SimplePdfDocument, garment: DesignApprovalSheetGarment) {
  if (garment.adjustments.length === 0) return;
  const top = 396;
  doc.text("CATATAN CUSTOM PER UKURAN", X, top, { size: 6.2, font: "bold", color: N });
  let y = top + 8;
  y += pdfTableRow({
    doc,
    x: X,
    y,
    widths: [70, 120, WIDTH - 70 - 120 - 60, 60],
    values: ["Size", "Warna", "Perubahan", "Qty"],
    header: true,
  });
  const rows = garment.adjustments.slice(0, 3);
  rows.forEach((adjustment) => {
    y += pdfTableRow({
      doc,
      x: X,
      y,
      widths: [70, 120, WIDTH - 70 - 120 - 60, 60],
      values: [
        adjustment.size || "-",
        adjustment.color ?? "-",
        adjustment.changeNote,
        String(adjustment.quantity || "-"),
      ],
    });
  });
  const hidden = garment.adjustments.length - rows.length;
  if (hidden > 0) {
    doc.text(`+${hidden} penyesuaian lainnya`, X, y + 3, { size: 5.6, color: M });
  }
}

function signatureBlocks(doc: SimplePdfDocument, data: DesignApprovalSheetPdfData) {
  const top = 452;
  const boxWidth = (WIDTH - 24) / 3;
  const boxes: Array<{
    party: "design" | "customer" | "production";
    label: string;
  }> = [
    { party: "design", label: "DESAIN — OFISSIO" },
    { party: "customer", label: "PEMESAN" },
    { party: "production", label: "PRODUKSI — OFISSIO" },
  ];
  boxes.forEach((box, index) => {
    const x = X + index * (boxWidth + 12);
    doc.strokeRect(x, top, boxWidth, 74, L, 0.9);
    doc.text(box.label, x + 8, top + 6, { size: 5.6, font: "bold", color: N });
    const signature = data.signatures.find((item) => item.party === box.party);
    if (signature) {
      doc.text(signature.signerName, x + 8, top + 26, { size: 8, font: "bold", color: I });
      doc.text(signature.signerTitle, x + 8, top + 38, { size: 6.4, color: M });
      doc.text(
        `Ditandatangani digital ${signature.signedAt ? formatInvoiceDate(signature.signedAt) : "-"}`,
        x + 8,
        top + 56,
        { size: 5.4, color: "#047857" },
      );
    } else {
      doc.line(x + 8, top + 46, x + boxWidth - 8, top + 46, L);
      doc.text("Nama / jabatan (ttd digital via portal)", x + 8, top + 52, {
        size: 5.2,
        color: M,
      });
    }
  });
  doc.wrappedText(
    `Klausa persetujuan: ${data.consentText}`,
    X,
    top + 82,
    WIDTH,
    { size: 5.8, color: M, lineHeight: 8 },
  );
}

function footer(
  doc: SimplePdfDocument,
  data: DesignApprovalSheetPdfData,
  pageNumber: number,
  total_pages: number,
) {
  doc.line(X, 566, R, 566, N);
  doc.text("OFISSIO — LEMBAR APPROVAL DESAIN", X, 574, { size: 5.4, font: "bold", color: N });
  doc.text(`${data.contactEmail} | ${data.contactWeb}`, X, 584, { size: 5.4, color: M });
  doc.text(
    `${data.locationLabel} | ${formatInvoiceDate(data.generatedAt)}`,
    R,
    574,
    { size: 5.4, color: M, align: "right" },
  );
  doc.text(`Lembar ${pageNumber} dari ${total_pages}`, R, 584, {
    size: 5.4,
    font: "bold",
    color: N,
    align: "right",
  });
  if (data.productionNotes) {
    doc.text(`Catatan produksi: ${truncate(data.productionNotes, 120)}`, X, 584, {
      size: 5.4,
      color: M,
    });
  }
}

function truncate(value: string, max: number) {
  const clean = value.trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}
