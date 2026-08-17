import assert from "node:assert/strict";

import {
  nextMonthlyDocumentSequence,
  processRouteCode,
  safeDocumentNumber,
} from "../src/features/documents/document.utils";
import { formatCustomerRequestNumber } from "../src/features/quotation/quotation.utils";

const date = new Date("2026-08-15T00:00:00.000Z");

assert.equal(processRouteCode("fulfillment"), "STK");
assert.equal(processRouteCode("customization"), "CUS");
assert.equal(processRouteCode("production"), "PRO");

assert.equal(
  safeDocumentNumber({ documentType: "quotation_pdf", processRoute: "fulfillment", sequence: 1, date }),
  "QUO-STK-2608-001",
);
assert.equal(
  safeDocumentNumber({ documentType: "invoice_pdf", processRoute: "customization", sequence: 12, date }),
  "INV-CUS-2608-012",
);
assert.equal(
  safeDocumentNumber({ documentType: "production_work_order_pdf", processRoute: "production", sequence: 3, date }),
  "PWO-PRO-2608-003",
);

assert.equal(formatCustomerRequestNumber("QUO-CUS-2608-006", "customization"), "REQ-CUS-2608-006");
assert.equal(
  formatCustomerRequestNumber("QUO/OFS/PRO/2026/08/0007", "production"),
  "REQ-PRO-2608-007",
);

assert.equal(
  nextMonthlyDocumentSequence({
    existingNumbers: ["QUO/OFS/FUL/2026/08/0004", "QUO-STK-2608-006"],
    prefix: "QUO",
    processRoute: "fulfillment",
    date,
  }),
  7,
);

console.log("Document numbering tests: PASS");
console.log("- compact STK/CUS/PRO format: PASS");
console.log("- legacy monthly sequence compatibility: PASS");
