import assert from "node:assert/strict";

import {
  getBriefApprovalStatus,
  normalizeProductionBrief,
  requiresCustomerBriefApproval,
} from "../src/features/quotation/quotation-requirement";
import {
  adminBriefSignatureBodySchema,
  adminBriefUpdateSchema,
  customBriefSignatureBodySchema,
} from "../src/features/quotation/quotation.validation";
import type { ProductionRequestBrief } from "../src/features/quotation/quotation.types";
import {
  createDefaultEmbroideryPricingZones,
  validatePlacementDimensions,
} from "../src/features/products/embroidery-pricing";
import { logoPlacementSchema } from "../src/schemas/uniform-3d";

// --- 1. Normalizer: brief lama (tanpa field baru) tetap lolos -------------
const legacyBrief = {
  projectName: "Seragam Apotek Klinik",
  garmentType: "Polo shirt",
  designDescription: "Polo shirt bordir logo apotek",
  materialPreference: "Fleece cotton 240 gsm",
  colorPreference: null,
  sizeNotes: null,
  targetDate: null,
  intakeChannel: "whatsapp",
  technicalSpecifications: [
    {
      id: "g1",
      category: "upper" as const,
      garmentType: "Polo shirt",
      templateKey: null,
      quantity: 40,
      specifications: [
        {
          key: "bahan",
          label: "Bahan",
          status: "specified" as const,
          option: "Fleece cotton",
          detail: null,
          notes: null,
        },
      ],
      sizeBreakdown: [
        { size: "M", quantity: 20 },
        { size: "L", quantity: 20 },
      ],
    },
  ],
} satisfies ProductionRequestBrief;

const normalizedLegacy = normalizeProductionBrief(legacyBrief);
assert.ok(normalizedLegacy);
assert.equal(normalizedLegacy.revisionNo, 0);
assert.equal(normalizedLegacy.revisedAt, null);
assert.deepEqual(normalizedLegacy.customAdjustments, []);
assert.deepEqual(normalizedLegacy.signatures, []);
const legacyGarment = normalizedLegacy.technicalSpecifications?.[0]!;
assert.deepEqual(legacyGarment.embroideryAreas, []);
assert.equal(legacyGarment.figureFrontFileId, null);
assert.equal(legacyGarment.figureBackFileId, null);
assert.equal(legacyGarment.specifications[0]!.measurements, null);
assert.equal(legacyGarment.sizeBreakdown[0]!.gender, undefined);
console.log("PASS: brief lama dinormalisasi tanpa field baru");

// --- 2. Normalizer: field baru lengkap ------------------------------------
const fullBrief: ProductionRequestBrief = {
  ...legacyBrief,
  revisionNo: 2,
  revisedAt: "2026-08-29T02:00:00.000Z",
  customAdjustments: [
    { id: "adj1", size: "XL", color: "Navy", changeNote: "Tanpa logo dada", quantity: 2 },
  ],
  signatures: [
    {
      party: "customer",
      signerName: "dr. Anita",
      signerTitle: "Owner",
      signerUserId: null,
      method: "portal_click",
      consentText: "setuju",
      signedAt: "2026-08-29T01:00:00.000Z",
      revokedAt: null,
      revisionNo: 1,
    },
    { party: "bogus" as never, signerName: "", signerTitle: "", signerUserId: null, method: "portal_click", consentText: null, signedAt: "", revokedAt: null, revisionNo: 0 },
  ],
  technicalSpecifications: [
    {
      ...legacyGarment,
      sizeBreakdown: [
        { size: "M", quantity: 10, gender: "men" },
        { size: "M", quantity: 10, gender: "women" },
        { size: "XXL", quantity: 1, gender: "alien" as never },
      ],
      embroideryAreas: [
        {
          label: "A",
          zone: "left_chest",
          positionNote: "Dada kiri",
          offsetXCm: null,
          offsetYCm: null,
          widthCm: 8,
          heightCm: 4,
          technique: "embroidery",
          logoFileId: null,
          logoFileName: null,
          notes: null,
        },
        {
          label: "B",
          zone: "bogus_zone" as never,
          positionNote: null,
          offsetXCm: null,
          offsetYCm: null,
          widthCm: 0,
          heightCm: 0,
          technique: "embroidery",
          logoFileId: null,
          logoFileName: null,
          notes: null,
        },
      ],
      figureFrontFileId: "file-front-1",
      figureBackFileId: "file-back-1",
      specifications: [
        { ...legacyGarment.specifications[0]!, measurements: "Lingkar dada 108 cm" },
      ],
    },
  ],
};

const normalizedFull = normalizeProductionBrief(fullBrief);
assert.ok(normalizedFull);
assert.equal(normalizedFull.revisionNo, 2);
assert.equal(normalizedFull.customAdjustments?.length, 1);
assert.equal(normalizedFull.signatures?.length, 1);
assert.equal(normalizedFull.signatures[0]!.party, "customer");
const fullGarment = normalizedFull.technicalSpecifications?.[0]!;
assert.equal(fullGarment.embroideryAreas?.length, 1);
assert.equal(fullGarment.embroideryAreas[0]!.zone, "left_chest");
assert.equal(fullGarment.sizeBreakdown[2]!.gender, undefined);
assert.equal(fullGarment.specifications[0]!.measurements, "Lingkar dada 108 cm");
assert.equal(fullGarment.figureFrontFileId, "file-front-1");
console.log("PASS: field baru dinormalisasi (invalid difilter)");

// --- 3. Gate approval -------------------------------------------------------
// Brief lama tanpa approvalStatus eksplisit dinormalisasi ke "not_required"
// (gate terbuka — semantik per kasus semua kanal); brief yang menunggu
// persetujuan customer tetap terkunci.
assert.equal(
  requiresCustomerBriefApproval({
    source: "custom_request",
    productionBrief: normalizedLegacy,
  }),
  false,
);
const pendingBrief = normalizeProductionBrief({
  ...legacyBrief,
  approvalStatus: "pending_customer_approval",
});
assert.equal(
  requiresCustomerBriefApproval({
    source: "custom_request",
    productionBrief: pendingBrief,
  }),
  true,
);
const approvedBrief = normalizeProductionBrief({
  ...legacyBrief,
  approvalStatus: "approved",
});
assert.equal(
  requiresCustomerBriefApproval({
    source: "custom_request",
    productionBrief: approvedBrief,
  }),
  false,
);
console.log("PASS: gate approval customer tetap bekerja");

// --- 4. Skema ttd customer -------------------------------------------------
const missingIdentity = customBriefSignatureBodySchema.safeParse({
  action: "approve",
});
assert.equal(missingIdentity.success, false);

const missingConsent = customBriefSignatureBodySchema.safeParse({
  action: "approve",
  signerName: "dr. Anita",
  signerTitle: "Owner",
  consentAccepted: false,
});
assert.equal(missingConsent.success, false);

const validApprove = customBriefSignatureBodySchema.safeParse({
  action: "approve",
  signerName: "dr. Anita",
  signerTitle: "Owner",
  consentAccepted: true,
});
assert.equal(validApprove.success, true);

const revisionWithoutNote = customBriefSignatureBodySchema.safeParse({
  action: "request_revision",
  note: "  ",
});
assert.equal(revisionWithoutNote.success, false);
console.log("PASS: skema ttd customer (identitas + klausa wajib)");

// --- 5. Skema admin --------------------------------------------------------
const validInternalSignature = adminBriefSignatureBodySchema.safeParse({
  party: "design",
  signerName: "Rina Desainer",
  signerTitle: "Design Lead",
});
assert.equal(validInternalSignature.success, true);
assert.equal(
  adminBriefSignatureBodySchema.safeParse({ party: "customer", signerName: "X", signerTitle: "Y" })
    .success,
  false,
);

const validAdminBrief = adminBriefUpdateSchema.safeParse({
  productionBrief: {
    projectName: "Seragam Apotek Klinik",
    garmentType: "Polo shirt",
    estimatedQuantity: 40,
    designDescription: "Polo shirt bordir logo apotek",
    technicalSpecifications: [
      {
        id: "g1",
        category: "upper",
        garmentType: "Polo shirt",
        templateKey: null,
        quantity: 40,
        specifications: [],
        sizeBreakdown: [{ size: "M", quantity: 10, gender: "men" }],
        embroideryAreas: [
          {
            label: "C",
            zone: "middle_back",
            positionNote: "Punggung tengah",
            offsetXCm: null,
            offsetYCm: null,
            widthCm: 27,
            heightCm: 7,
            technique: "embroidery",
            logoFileId: null,
            logoFileName: null,
            notes: null,
          },
        ],
      },
    ],
    customAdjustments: [
      { id: "adj1", size: "XL", color: null, changeNote: "Tanpa logo dada", quantity: 2 },
    ],
  },
});
assert.equal(validAdminBrief.success, true);

const duplicateZone = adminBriefUpdateSchema.safeParse({
  productionBrief: {
    projectName: "Seragam Apotek Klinik",
    garmentType: "Polo shirt",
    estimatedQuantity: 40,
    designDescription: "Polo shirt bordir logo apotek",
    technicalSpecifications: [
      {
        id: "g1",
        category: "upper",
        garmentType: "Polo shirt",
        templateKey: null,
        quantity: 40,
        specifications: [],
        sizeBreakdown: [],
        embroideryAreas: [
          {
            label: "A",
            zone: "left_chest",
            positionNote: null,
            offsetXCm: null,
            offsetYCm: null,
            widthCm: 8,
            heightCm: 4,
            technique: "embroidery",
            logoFileId: null,
            logoFileName: null,
            notes: null,
          },
          {
            label: "B",
            zone: "left_chest",
            positionNote: null,
            offsetXCm: null,
            offsetYCm: null,
            widthCm: 8,
            heightCm: 4,
            technique: "embroidery",
            logoFileId: null,
            logoFileName: null,
            notes: null,
          },
        ],
      },
    ],
  },
});
assert.equal(duplicateZone.success, false);
console.log("PASS: skema admin brief + duplikat zona ditolak");

// --- 6. Zod placement dilebarkan (punggung 27 cm) --------------------------
const widePlacement = logoPlacementSchema.safeParse({
  zone: "middle_back",
  logoFileId: "f1",
  logoFileName: "logo.png",
  widthCm: 27,
  heightCm: 7,
  rotation: 0,
  technique: "embroidery",
});
assert.equal(widePlacement.success, true);
const tooWide = logoPlacementSchema.safeParse({
  zone: "middle_back",
  logoFileId: "f1",
  logoFileName: "logo.png",
  widthCm: 32,
  heightCm: 7,
  rotation: 0,
  technique: "embroidery",
});
assert.equal(tooWide.success, false);
console.log("PASS: zod placement menerima 27 cm, tolak 32 cm");

// --- 7. validatePlacementDimensions per zona -------------------------------
const defaultZones = createDefaultEmbroideryPricingZones();
assert.deepEqual(
  validatePlacementDimensions(
    { zoneId: "middle_back", widthCm: 27, heightCm: 7 },
    defaultZones,
  ),
  [],
);
assert.deepEqual(
  validatePlacementDimensions(
    { zoneId: "back", widthCm: 27, heightCm: 7 },
    defaultZones,
  ),
  [],
);
const overWidth = validatePlacementDimensions(
  { zoneId: "center_back", widthCm: 32, heightCm: 7 },
  defaultZones,
);
assert.equal(overWidth.length, 1);
assert.equal(overWidth[0]!.maxWidthCm, 30);
const overHeight = validatePlacementDimensions(
  { zoneId: "left_chest", widthCm: 8, heightCm: 9 },
  defaultZones,
);
assert.equal(overHeight.length, 1);
assert.equal(overHeight[0]!.maxHeightCm, 8);
assert.deepEqual(
  validatePlacementDimensions(
    { zoneId: "unknown_zone", widthCm: 99, heightCm: 99 },
    defaultZones,
  ),
  [],
);
console.log("PASS: validasi dimensi per zona (zona tak dikenal dilewati)");

console.log("PASS: semua asersi design-approval (fase data model) lulus");

// --- 8. Service-level: approve / revisi / ttd internal (mock repo) -----------
async function runServiceTests() {
const {
  addInternalBriefSignature,
  createCustomQuotationRequest,
  signSalesAssistedBrief,
  updateSalesAssistedBrief,
} = await import("../src/features/quotation/quotation.service");

function seedBrief() {
  return normalizeProductionBrief({
    ...legacyBrief,
    estimatedQuantity: 40,
    intakeChannel: "whatsapp",
    approvalStatus: "pending_customer_approval",
  })!;
}

const seeded = await createCustomQuotationRequest({
  companyId: "comp_test",
  companyName: "Apotek Klinik Sehat",
  userId: "user_test",
  userEmail: null,
  userName: null,
  picName: "dr. Anita",
  picEmail: "anita@example.test",
  picWhatsapp: null,
  productionBrief: seedBrief(),
  referenceFileIds: [],
  customerNotes: null,
  actorType: "internal",
  sendCustomerConfirmation: false,
});

// 8a. approve tanpa identitas → 400
await assert.rejects(
  signSalesAssistedBrief({
    id: seeded.quotation.id,
    companyId: "comp_test",
    userId: "user_test",
    action: "approve",
  }),
  (error: { status?: number }) => error.status === 400,
);
// 8b. approve tanpa centang klausa → 400
await assert.rejects(
  signSalesAssistedBrief({
    id: seeded.quotation.id,
    companyId: "comp_test",
    userId: "user_test",
    action: "approve",
    signerName: "dr. Anita",
    signerTitle: "Owner",
    consentAccepted: false,
  }),
  (error: { status?: number }) => error.status === 400,
);
console.log("PASS: approve tanpa identitas/klausa ditolak 400");

// 8c. ttd internal tidak mengubah approvalStatus
const internalSigned = await addInternalBriefSignature({
  id: seeded.quotation.id,
  actorId: "admin_test",
  party: "design",
  signerName: "Rina Desainer",
  signerTitle: "Design Lead",
});
assert.equal(getBriefApprovalStatus(internalSigned.productionBrief), "pending_customer_approval");
assert.equal(
  internalSigned.productionBrief?.signatures?.filter((item) => !item.revokedAt).length,
  1,
);
console.log("PASS: ttd internal design tersimpan tanpa mengubah approval");

// 8d. approve valid → gate terbuka + ttd customer + status submitted
const approvedQuote = await signSalesAssistedBrief({
  id: seeded.quotation.id,
  companyId: "comp_test",
  userId: "user_test",
  action: "approve",
  signerName: "dr. Anita",
  signerTitle: "Owner",
  consentAccepted: true,
});
assert.equal(approvedQuote.status, "submitted");
assert.equal(requiresCustomerBriefApproval(approvedQuote), false);
const activeAfterApprove = approvedQuote.productionBrief?.signatures?.filter(
  (item) => !item.revokedAt,
);
assert.equal(activeAfterApprove?.length, 2);
assert.equal(activeAfterApprove?.find((item) => item.party === "customer")?.signerName, "dr. Anita");

// 8e. idempoten: approve ulang mengembalikan record tanpa ttd baru
const reApproved = await signSalesAssistedBrief({
  id: seeded.quotation.id,
  companyId: "comp_test",
  userId: "user_test",
  action: "approve",
  signerName: "dr. Anita",
  signerTitle: "Owner",
  consentAccepted: true,
});
assert.equal(
  reApproved.productionBrief?.signatures?.filter((item) => !item.revokedAt).length,
  2,
);
console.log("PASS: approve valid membuka gate + idempoten");

// 8f. edit brief setelah approval → ditolak
await assert.rejects(
  updateSalesAssistedBrief({
    id: seeded.quotation.id,
    actorId: "admin_test",
    brief: seedBrief(),
  }),
  (error: { status?: number }) => error.status === 400,
);

// 8g. request_revision → revisionNo naik, semua ttd dicabut, gate tertutup
const revised = await signSalesAssistedBrief({
  id: seeded.quotation.id,
  companyId: "comp_test",
  userId: "user_test",
  action: "request_revision",
  note: "Logo punggung turun 2 cm.",
});
assert.equal(revised.status, "draft");
assert.equal(revised.productionBrief?.revisionNo, 1);
assert.equal(revised.productionBrief?.signatures?.filter((item) => !item.revokedAt).length, 0);
assert.equal(revised.productionBrief?.approvalRevisionNote, "Logo punggung turun 2 cm.");
assert.equal(requiresCustomerBriefApproval(revised), true);
console.log("PASS: request_revision menaikkan revisi & mencabut semua ttd");

// 8h. admin edit brief saat belum approved → pending_customer_approval
const edited = await updateSalesAssistedBrief({
  id: seeded.quotation.id,
  actorId: "admin_test",
  brief: {
    ...seedBrief(),
    designDescription: "Polo shirt bordir logo apotek, revisi posisi punggung.",
  },
});
assert.equal(getBriefApprovalStatus(edited.productionBrief), "pending_customer_approval");
assert.equal(edited.productionBrief?.revisionNo, 1);
assert.equal(edited.productionBrief?.signatures?.every((item) => item.revokedAt), true);
console.log("PASS: edit admin mengembalikan ke pending & pertahankan revisionNo");

// 8i. approve ulang setelah revisi membuka gate kembali
const reApprovedAfterRevision = await signSalesAssistedBrief({
  id: seeded.quotation.id,
  companyId: "comp_test",
  userId: "user_test",
  action: "approve",
  signerName: "dr. Anita",
  signerTitle: "Owner",
  consentAccepted: true,
});
assert.equal(requiresCustomerBriefApproval(reApprovedAfterRevision), false);
assert.equal(reApprovedAfterRevision.productionBrief?.revisionNo, 1);
console.log("PASS: approve ulang setelah revisi membuka gate");

console.log("PASS: semua asersi design-approval (fase service) lulus");
}

// --- 9. PDF engine: landscape + embed gambar (C1) ----------------------------
async function runPdfEngineTests() {
const { SimplePdfDocument } = await import("../src/features/documents/pdf/pdf-renderer");

const portrait = new SimplePdfDocument();
assert.equal(portrait.width, 595.28);
assert.equal(portrait.height, 841.89);

const landscape = new SimplePdfDocument({ orientation: "landscape" });
assert.equal(landscape.width, 841.89);
assert.equal(landscape.height, 595.28);

// PNG 1x1 RGB valid (base64 literal).
const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
assert.equal(landscape.image(pngBytes, 40, 40, 120, 90), true);
// Bytes acak → bukan gambar dikenal, harus ditolak tanpa exception.
assert.equal(landscape.image(Buffer.from([0x00, 0x01, 0x02, 0x03]), 0, 0, 10, 10), false);
// JPEG baseline minimal (SOF0 2x3, 3 komponen) — cukup untuk parsing dimensi.
const fakeJpeg = Buffer.from([
  0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x02, 0x00, 0x03, 0x03,
  0x00, 0x00, 0x00, 0x00, 0xff, 0xd9,
]);
assert.equal(landscape.image(fakeJpeg, 200, 40, 60, 40), true);
// JPEG progressive (SOF2) ditolak.
const progressiveJpeg = Buffer.from([
  0xff, 0xd8, 0xff, 0xc2, 0x00, 0x0b, 0x08, 0x00, 0x02, 0x00, 0x03, 0x03,
  0xff, 0xd9,
]);
assert.equal(landscape.image(progressiveJpeg, 400, 40, 60, 40), false);
// Gambar sama (dedupe cache) tetap bisa digambar lagi di halaman lain.
landscape.addPage();
assert.equal(landscape.image(pngBytes, 60, 60, 100, 80), true);
landscape.text("Lembar Approval Desain", 40, 160, { size: 14, font: "bold" });

const output = Buffer.from(landscape.render());
const asLatin1 = output.toString("latin1");
assert.ok(asLatin1.startsWith("%PDF-1.4"), "header PDF");
assert.ok(asLatin1.includes("/MediaBox [0 0 841.89 595.28]"), "mediaBox landscape");
assert.ok(asLatin1.includes("/Type /Page /Parent"), "objek halaman");
assert.ok(asLatin1.includes("/Subtype /Image"), "objek gambar");
assert.ok(asLatin1.includes("/Filter /DCTDecode"), "embed JPEG");
assert.ok(asLatin1.includes("/Filter /FlateDecode"), "embed PNG");
assert.ok(asLatin1.includes("/Im1 Do"), "op draw gambar 1");
assert.ok(asLatin1.includes("/Im2 Do"), "op draw gambar 2");
assert.ok(!asLatin1.includes("/Im3 "), "gambar didedupe per konten");

// xref: setiap offset harus menunjuk tepat ke "N 0 obj".
const startxrefIndex = asLatin1.lastIndexOf("startxref\n");
const startxref = Number(
  asLatin1.slice(startxrefIndex + 10, asLatin1.indexOf("\n", startxrefIndex + 10)),
);
assert.ok(asLatin1.slice(startxref, startxref + 5) === "xref\n", "startxref menunjuk tabel xref");
const xrefBlock = asLatin1.slice(startxref);
const xrefHeader = xrefBlock.split("\n")[1]!;
const xrefCount = Number(xrefHeader.split(" ")[1]);
assert.ok(Number.isFinite(xrefCount) && xrefCount > 5, "header xref terbaca");
const xrefLines = xrefBlock.split("\n").slice(2, 2 + xrefCount);
let checked = 0;
for (let index = 1; index < xrefLines.length; index += 1) {
  const entry = xrefLines[index]!;
  if (entry.endsWith("f")) continue;
  const offset = Number(entry.slice(0, 10));
  const objectHeader = asLatin1.slice(offset, offset + 12);
  assert.ok(
    objectHeader.startsWith(`${index} 0 obj`),
    `xref ${index} menunjuk objek (dapat: ${JSON.stringify(objectHeader)})`,
  );
  checked += 1;
}
assert.ok(checked >= 10, `semua entri xref objek diverifikasi (${checked})`);
console.log("PASS: PDF landscape + embed JPEG/PNG + xref valid");
}

// --- 10. Template lembar approval desain (C3) --------------------------------
async function runApprovalSheetTemplateTests() {
const { designApprovalSheetOfissioTemplate } = await import(
  "../src/features/documents/pdf/templates/design-approval-sheet-ofissio.template"
);
const { DESIGN_APPROVAL_SHEET_RENDERER_VERSION } = await import(
  "../src/features/documents/pdf/templates/design-approval-sheet-ofissio.template"
);
assert.equal(DESIGN_APPROVAL_SHEET_RENDERER_VERSION, "das-ofissio-v1");
assert.equal(designApprovalSheetOfissioTemplate.kind, "design_approval_sheet");
assert.equal(designApprovalSheetOfissioTemplate.id, "design_approval_sheet_ofissio");

const pngFigure = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const garment1 = {
  itemCode: "AK-001",
  garmentType: "Polo Shirt Pria",
  projectName: "Seragam Apotek Klinik",
  clientLabel: "Apotek Klinik Sehat — dr. Anita",
  poNumber: "PO-2026-088",
  deadline: "2026-09-20",
  totalQuantity: 38,
  materialLabel: "Lacoste cotton 230 gsm",
  colorLabel: "Navy",
  sizeNotes: "Lingkar dada M = 100 cm",
  specifications: [
    { label: "Bahan", value: "Lacoste cotton", measurements: "230 gsm", status: "specified" },
    { label: "Kerah", value: "Polo", measurements: null, status: "specified" },
    { label: "Manchet", value: "Mengikuti rekomendasi tim", measurements: null, status: "recommendation" },
  ],
  areas: [
    { label: "A", zone: "left_chest", zoneLabel: "Dada kiri", techniqueLabel: "Bordir", positionNote: "Sejajar saku, 7 cm di bawah jahitan lengan", widthCm: 7, heightCm: 5, offsetXCm: null, offsetYCm: null, logoFileName: "logo-apotek.png", notes: null },
    { label: "B", zone: "middle_back", zoneLabel: "Punggung tengah", techniqueLabel: "Bordir", positionNote: "5 cm di bawah kerah", widthCm: 27, heightCm: 7, offsetXCm: null, offsetYCm: null, logoFileName: "nama-klinik.png", notes: null },
  ],
  allSizes: ["S", "M", "L", "XL"],
  sizeRows: [
    { group: "Pria", cells: [{ size: "S", quantity: 2 }, { size: "M", quantity: 10 }, { size: "L", quantity: 8 }, { size: "XL", quantity: 2 }], total: 22 },
    { group: "Wanita", cells: [{ size: "S", quantity: 4 }, { size: "M", quantity: 8 }, { size: "L", quantity: 4 }, { size: "XL", quantity: 0 }], total: 16 },
  ],
  adjustments: [
    { size: "XL", color: "Navy", changeNote: "Tanpa logo dada, hanya punggung", quantity: 2 },
  ],
  figures: {
    front: { side: "front" as const, bytes: pngFigure, fileName: "mockup-depan.png" },
    back: { side: "back" as const, bytes: pngFigure, fileName: "mockup-belakang.png" },
  },
};
const garment2 = {
  ...garment1,
  itemCode: "AK-002",
  garmentType: "Blazer Wanita",
  areas: [],
  adjustments: [],
  figures: { front: null, back: null },
};

const output = Buffer.from(
  designApprovalSheetOfissioTemplate.render({
    documentNumber: "DAS-PRO-2608-001",
    quotationNumber: "QUO-PRO-2608-010",
    projectName: "Seragam Apotek Klinik",
    clientName: "dr. Anita",
    clientCompany: "Apotek Klinik Sehat",
    poNumber: "PO-2026-088",
    deadline: "2026-09-20",
    revisionNo: 1,
    revisedAt: "2026-08-28T02:00:00.000Z",
    approvalStatus: "pending_customer_approval",
    createdAt: "2026-08-20T02:00:00.000Z",
    generatedAt: "2026-08-28T04:00:00.000Z",
    garments: [garment1, garment2],
    signatures: [
      { party: "design" as const, signerName: "Rina Desainer", signerTitle: "Design Lead", signedAt: "2026-08-28T03:00:00.000Z" },
    ],
    consentText:
      "Dengan menandatangani lembar ini, pemesan menyetujui desain, bahan, warna, posisi bordir, dan jumlah yang tercantum.",
    productionNotes: "Produksi dimulai setelah DP diterima.",
    locationLabel: "Kabupaten Bandung, Indonesia",
    contactTel: "-",
    contactWeb: "www.ofissio.com",
    contactEmail: "halo@ofissio.com",
    rendererVersion: DESIGN_APPROVAL_SHEET_RENDERER_VERSION,
  }),
);
const asLatin1 = output.toString("latin1");
assert.ok(asLatin1.startsWith("%PDF-1.4"), "header PDF template");
const pageCount = (asLatin1.match(/\/Type \/Page[^s]/g) ?? []).length;
assert.equal(pageCount, 2, `1 halaman per garment (dapat ${pageCount})`);
assert.ok(asLatin1.includes("LEMBAR APPROVAL DESAIN"), "judul lembar");
assert.ok(asLatin1.includes("REVISI 01"), "badge revisi");
assert.ok(asLatin1.includes("AK-001") && asLatin1.includes("AK-002"), "kode item");
assert.ok(asLatin1.includes("PO-2026-088"), "no. PO");
assert.ok(asLatin1.includes("Lembar 1 dari 2") && asLatin1.includes("Lembar 2 dari 2"), "footer halaman");
assert.ok(asLatin1.includes("Rina Desainer"), "ttd internal terisi");
assert.ok(asLatin1.includes("Nama / jabatan \\(ttd digital via portal\\)"), "blok ttd kosong");
assert.ok(asLatin1.includes("/Im1 Do"), "figur foto digambar");
assert.ok(asLatin1.includes("BORDIR & AREA LOGO"), "tabel area bordir");
console.log("PASS: template lembar approval desain (2 garment = 2 halaman)");
}

// --- 11. Pengayaan brief customer portal → brief teknis (enrichment) --------
async function runPortalEnrichmentTests() {
const {
  createCustomQuotationRequest,
  signSalesAssistedBrief,
  startBriefEnrichment,
  updateSalesAssistedBrief,
} = await import("../src/features/quotation/quotation.service");

// 11a. Customer kirim permintaan portal — field internal di-strip server-side.
const portalSeeded = await createCustomQuotationRequest({
  companyId: "comp_test",
  companyName: "Klinik Sehat Sentosa",
  userId: "user_customer",
  userEmail: null,
  userName: null,
  picName: "Budi Santoso",
  picEmail: "budi@example.test",
  picWhatsapp: null,
  productionBrief: {
    projectName: "Seragam Klinik Sehat",
    garmentType: "Seragam medis",
    estimatedQuantity: 25,
    usageContext: "Pemakaian harian petugas",
    designDescription: "Seragam medis wanita dengan aksen pink dan logo klinik.",
    materialPreference: "Katun twill",
    colorPreference: "Putih - pink",
    sizeNotes: "Ukuran S-XL",
    targetDate: null,
    // Percobaan injeksi jalur internal — wajib di-strip untuk actorType customer.
    intakeChannel: "whatsapp",
    technicalSpecifications: legacyBrief.technicalSpecifications ?? [],
    customAdjustments: [],
  },
  referenceFileIds: [],
  customerNotes: null,
  actorType: "customer",
  sendCustomerConfirmation: false,
});
const portalQuote = portalSeeded.quotation;
const portalId = portalQuote.id;
assert.equal(portalQuote.status, "submitted");
assert.equal(portalQuote.productionBrief?.intakeChannel, "customer_portal");
assert.equal(portalQuote.productionBrief?.technicalSpecifications?.length ?? 0, 0);
assert.equal(getBriefApprovalStatus(portalQuote.productionBrief), "approved");
assert.equal(requiresCustomerBriefApproval(portalQuote), false);
console.log("PASS: brief portal lahir approved + field internal di-strip");

// 11b. Alur sales terkunci sebelum takeover.
await assert.rejects(
  signSalesAssistedBrief({
    id: portalId,
    companyId: "comp_test",
    userId: "user_customer",
    action: "approve",
    signerName: "Budi Santoso",
    signerTitle: "Owner",
    consentAccepted: true,
  }),
  (error: { status?: number }) => error.status === 400,
);
await assert.rejects(
  updateSalesAssistedBrief({
    id: portalId,
    actorId: "admin_test",
    brief: normalizeProductionBrief(legacyBrief)!,
  }),
  (error: { status?: number }) => error.status === 400,
);
console.log("PASS: alur sales terkunci untuk brief portal yang belum diambil alih");

// 11c. Takeover: snapshot permintaan awal + enrichedAt, status tidak berubah.
const enriched = await startBriefEnrichment({ id: portalId, actorId: "admin_test" });
const enrichedAt = enriched.productionBrief?.enrichedAt ?? "";
assert.ok(enrichedAt);
assert.equal(
  enriched.productionBrief?.customerRequestSnapshot?.projectName,
  "Seragam Klinik Sehat",
);
assert.equal(
  enriched.productionBrief?.customerRequestSnapshot?.designDescription,
  "Seragam medis wanita dengan aksen pink dan logo klinik.",
);
assert.equal(getBriefApprovalStatus(enriched.productionBrief), "approved");
assert.equal(requiresCustomerBriefApproval(enriched), false);
const reEnrich = await startBriefEnrichment({ id: portalId, actorId: "admin_test" });
assert.equal(reEnrich.productionBrief?.enrichedAt, enrichedAt);
console.log("PASS: takeover menyimpan snapshot permintaan awal & idempoten");

// 11d. Simpan pengayaan dengan minta ttd → pending, gate tertutup, snapshot terjaga.
const savedTech = await updateSalesAssistedBrief({
  id: portalId,
  actorId: "admin_test",
  brief: {
    ...(enriched.productionBrief ?? normalizeProductionBrief(legacyBrief)!),
    designDescription: "Seragam medis hasil konsultasi: katun twill, logo dada kiri.",
    technicalSpecifications: legacyBrief.technicalSpecifications ?? [],
  },
  requireCustomerApproval: true,
});
assert.equal(
  getBriefApprovalStatus(savedTech.productionBrief),
  "pending_customer_approval",
);
assert.equal(requiresCustomerBriefApproval(savedTech), true);
assert.equal(
  savedTech.productionBrief?.customerRequestSnapshot?.projectName,
  "Seragam Klinik Sehat",
);
assert.equal(savedTech.productionBrief?.enrichedAt, enrichedAt);
assert.equal(savedTech.productionBrief?.intakeChannel, "customer_portal");
console.log("PASS: pengayaan minta ttd → pending & snapshot terjaga");

// 11e. Approve customer → gate terbuka, status quotation tetap submitted.
const portalApproved = await signSalesAssistedBrief({
  id: portalId,
  companyId: "comp_test",
  userId: "user_customer",
  action: "approve",
  signerName: "Budi Santoso",
  signerTitle: "Owner",
  consentAccepted: true,
});
assert.equal(portalApproved.status, "submitted");
assert.equal(requiresCustomerBriefApproval(portalApproved), false);
console.log("PASS: approve portal membuka gate tanpa mengubah status quotation");

// 11f. Revisi → revisi naik & ttd dicabut, status quotation TIDAK turun ke draft.
const portalRevised = await signSalesAssistedBrief({
  id: portalId,
  companyId: "comp_test",
  userId: "user_customer",
  action: "request_revision",
  note: "Warna aksen ganti mint.",
});
assert.equal(portalRevised.status, "submitted");
assert.equal(portalRevised.productionBrief?.revisionNo, 1);
assert.equal(
  portalRevised.productionBrief?.signatures?.filter((item) => !item.revokedAt).length,
  0,
);
assert.equal(requiresCustomerBriefApproval(portalRevised), true);
console.log("PASS: revisi portal tidak menurunkan status quotation ke draft");

// 11g. Skenario tanpa ttd: simpan ulang dengan requireCustomerApproval false.
const savedNoApproval = await updateSalesAssistedBrief({
  id: portalId,
  actorId: "admin_test",
  brief: {
    ...(portalRevised.productionBrief ?? normalizeProductionBrief(legacyBrief)!),
    designDescription: "Seragam medis final tanpa persetujuan formal (kasus sederhana).",
    technicalSpecifications: legacyBrief.technicalSpecifications ?? [],
  },
  requireCustomerApproval: false,
});
assert.equal(getBriefApprovalStatus(savedNoApproval.productionBrief), "not_required");
assert.equal(requiresCustomerBriefApproval(savedNoApproval), false);
console.log("PASS: pilihan tanpa ttd → not_required & gate tetap terbuka");

// 11h. Lembar approval desain bisa dibuat untuk brief portal yang diperkaya.
const { generateDesignApprovalSheetPdf } = await import(
  "../src/features/documents/document.service"
);
const das = await generateDesignApprovalSheetPdf({
  quotationId: portalId,
  actorId: "admin_test",
});
assert.ok(das.document.documentNumber.startsWith("DAS-"));
console.log("PASS: DAS PDF untuk brief portal diperkaya");

console.log("PASS: semua asersi pengayaan brief portal lulus");
}

// --- 12. Sales-assisted (WhatsApp) tanpa ttd customer (repeat order) --------
async function runSalesAssistedNoApprovalTests() {
const {
  createCustomQuotationRequest,
  updateSalesAssistedBrief,
} = await import("../src/features/quotation/quotation.service");

function whatsappBrief() {
  return normalizeProductionBrief({
    ...legacyBrief,
    estimatedQuantity: 40,
    intakeChannel: "whatsapp",
    approvalStatus: "pending_customer_approval",
  })!;
}

// 12a. Default (tanpa requireCustomerApproval) tetap lahir pending + gate tertutup.
const needsSignature = await createCustomQuotationRequest({
  companyId: "comp_wa",
  companyName: "PT WhatsApp Default",
  userId: "user_wa",
  userEmail: null,
  userName: null,
  picName: "Budi",
  picEmail: "budi@example.test",
  picWhatsapp: null,
  productionBrief: whatsappBrief(),
  referenceFileIds: [],
  customerNotes: null,
  actorType: "internal",
  sendCustomerConfirmation: false,
});
assert.equal(
  getBriefApprovalStatus(needsSignature.quotation.productionBrief),
  "pending_customer_approval",
);
assert.equal(requiresCustomerBriefApproval(needsSignature.quotation), true);
console.log("PASS: default sales-assisted tetap minta ttd customer");

// 12b. Repeat order: create dengan requireCustomerApproval false → not_required.
const repeatOrder = await createCustomQuotationRequest({
  companyId: "comp_wa",
  companyName: "PT Repeat Order",
  userId: "user_wa2",
  userEmail: null,
  userName: null,
  picName: "Sari",
  picEmail: "sari@example.test",
  picWhatsapp: null,
  productionBrief: whatsappBrief(),
  referenceFileIds: [],
  customerNotes: null,
  actorType: "internal",
  sendCustomerConfirmation: false,
  requireCustomerApproval: false,
});
assert.equal(
  getBriefApprovalStatus(repeatOrder.quotation.productionBrief),
  "not_required",
);
assert.equal(repeatOrder.quotation.productionBrief?.approvalRequestedAt ?? null, null);
assert.equal(requiresCustomerBriefApproval(repeatOrder.quotation), false);
console.log("PASS: brief WhatsApp repeat order lahir not_required + gate terbuka");

// 12c. Brief pending yang sudah ada bisa dibalik ke not_required per kasus.
const flipped = await updateSalesAssistedBrief({
  id: needsSignature.quotation.id,
  actorId: "admin_test",
  brief: whatsappBrief(),
  requireCustomerApproval: false,
});
assert.equal(getBriefApprovalStatus(flipped.productionBrief), "not_required");
assert.equal(flipped.productionBrief?.approvalRequestedAt ?? null, null);
assert.equal(requiresCustomerBriefApproval(flipped), false);
console.log("PASS: brief pending bisa dialihkan ke tanpa ttd (gate terbuka)");
}

runServiceTests()
  .then(() => runPortalEnrichmentTests())
  .then(() => runSalesAssistedNoApprovalTests())
  .then(() => runPdfEngineTests())
  .then(() => runApprovalSheetTemplateTests())
  .then(() => {
    console.log("SELESAI: semua asersi design-approval lulus");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
