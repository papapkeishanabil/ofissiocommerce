import "server-only";

import { invoiceOfissioCustomTemplate } from "./invoice-ofissio-custom.template";

export const invoiceDefaultTemplate = {
  ...invoiceOfissioCustomTemplate,
  id: "invoice_default" as const,
  label: "Invoice default",
};
