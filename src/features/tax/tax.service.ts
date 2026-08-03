import "server-only";

import { readTaxSettings, writeTaxSettings } from "./tax.repository";
import type { TaxSettingsPayload } from "./tax.validation";

export async function getGlobalTaxSettings() {
  return readTaxSettings();
}

export async function updateGlobalTaxSettings(payload: TaxSettingsPayload) {
  return writeTaxSettings(payload);
}
