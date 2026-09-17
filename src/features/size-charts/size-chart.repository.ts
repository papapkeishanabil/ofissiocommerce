import "server-only";

import { SupabaseDatabaseError } from "@/features/database/database.errors";
import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import { getRepositoryProvider } from "@/features/repositories/repository.config";
import {
  DEFAULT_SIZE_CHART_STANDARDS,
  normalizeSizeChartStandards,
  type SizeChartStandard,
} from "./size-chart.types";

type SizeChartState = {
  standards: SizeChartStandard[];
  source: "supabase" | "mock" | "fallback";
  schemaReady: boolean;
};
type SizeChartGlobal = typeof globalThis & { __ofissioSizeChartStandards?: SizeChartStandard[] };
const sizeChartGlobal = globalThis as SizeChartGlobal;
const mockStandards = sizeChartGlobal.__ofissioSizeChartStandards ??
  (sizeChartGlobal.__ofissioSizeChartStandards = DEFAULT_SIZE_CHART_STANDARDS.map((standard) => ({
    ...standard,
    rows: [...standard.rows],
  })));

export async function readSizeChartStandards(): Promise<SizeChartState> {
  if (getRepositoryProvider() === "mock") {
    return { standards: mockStandards.map((standard) => ({ ...standard, rows: [...standard.rows] })), source: "mock", schemaReady: true };
  }
  const client = getSupabaseAdminClient();
  if (!client) return { standards: [...mockStandards], source: "fallback", schemaReady: false };
  try {
    const rows = await client.select("size_chart_standards", { filters: { id: "global" }, limit: 1 });
    const row = rows[0] as Record<string, unknown> | undefined;
    // Row hasil seed migration menyimpan '[]'. Array kosong berarti admin belum
    // pernah menyimpan — tampilkan default, bukan "tanpa standar" (yang akan
    // menyembunyikan seluruh panduan ukuran).
    const stored = Array.isArray(row?.standards) ? (row?.standards as unknown[]) : null;
    if (!row || !stored || stored.length === 0) {
      return { standards: [...mockStandards], source: "fallback", schemaReady: true };
    }
    return {
      standards: normalizeSizeChartStandards(stored),
      source: "supabase",
      schemaReady: true,
    };
  } catch (error) {
    if (error instanceof SupabaseDatabaseError && error.reason === "relation_does_not_exist") {
      return { standards: [...mockStandards], source: "fallback", schemaReady: false };
    }
    throw error;
  }
}

export async function writeSizeChartStandards(
  standards: SizeChartStandard[],
): Promise<SizeChartState> {
  if (getRepositoryProvider() === "mock") {
    sizeChartGlobal.__ofissioSizeChartStandards = standards.map((standard) => ({ ...standard, rows: [...standard.rows] }));
    return readSizeChartStandards();
  }
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Master standar ukuran belum dikonfigurasi.");
  // Seed row id='global' selalu ada (insert on conflict di migration 038);
  // update ganda sebagai jaring pengaman bila seed dilewati.
  const existing = await client.select("size_chart_standards", { filters: { id: "global" }, limit: 1 });
  const row = { standards, updated_at: new Date().toISOString() };
  if (existing[0]) await client.update("size_chart_standards", row, { id: "global" });
  else await client.insert("size_chart_standards", { id: "global", ...row });
  return readSizeChartStandards();
}
