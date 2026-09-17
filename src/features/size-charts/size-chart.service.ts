import "server-only";

import {
  readSizeChartStandards,
  writeSizeChartStandards,
} from "./size-chart.repository";
import type { SizeChartStandard } from "./size-chart.types";

export async function getSizeChartStandards() {
  return readSizeChartStandards();
}

export async function updateSizeChartStandards(standards: SizeChartStandard[]) {
  return writeSizeChartStandards(standards);
}
