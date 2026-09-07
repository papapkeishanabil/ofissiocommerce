import "server-only";

import { readMoqSettings, writeMoqSettings } from "./moq-settings.repository";
import type { MoqSettingsPayload } from "./moq-settings.validation";

export async function getMoqSettings() {
  return readMoqSettings();
}

export async function updateMoqSettings(payload: MoqSettingsPayload) {
  return writeMoqSettings(payload);
}
