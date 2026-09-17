import { SupabaseDatabaseError } from "@/features/database/database.errors";

/** Only transient database reads may degrade; configuration/programming errors still surface. */
export async function readOptionalCommerceSetting<T>(read: () => Promise<T>): Promise<T | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try { return await read(); }
    catch (error) {
      const transient = error instanceof SupabaseDatabaseError && (error.reason === "network_error" || (error.status !== undefined && error.status >= 500));
      if (!transient) throw error;
      if (attempt === 1) return null;
    }
  }
  return null;
}
