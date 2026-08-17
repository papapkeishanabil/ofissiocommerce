import { loadEnvConfig } from "@next/env";

import { isAdminWebPushConfigured } from "../src/features/admin-notifications/admin-push.service";
import { listManagedInternalUsers } from "../src/features/admin-users/admin-user.service";
import { getEmailRuntimeConfig } from "../src/features/email/email.config";
import { getSupabaseAdminClient } from "../src/features/database/supabase-admin.client";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

async function main() {
  console.log("Ofissio CS notification readiness");
  console.log("---------------------------------");
  const users = await listManagedInternalUsers();
  const csUsers = users.filter((user) => user.role === "sales" && user.status === "active" && user.email);
  const email = getEmailRuntimeConfig();
  const client = getSupabaseAdminClient();
  const subscriptions = client
    ? await client.select<Record<string, unknown>>("admin_push_subscriptions", { filters: { recipient_role: "sales", active: true } })
    : [];
  const checks = [
    { ok: csUsers.length > 0, label: `${csUsers.length} akun CS Full Custom aktif dengan email` },
    { ok: email.enabled && email.provider !== "mock", label: `email provider=${email.provider}, enabled=${email.enabled}` },
    { ok: isAdminWebPushConfigured(), label: "VAPID push configuration" },
  ];
  for (const check of checks) console.log(`${check.ok ? "PASS" : "FAIL"}: ${check.label}`);
  console.log(`${subscriptions.length ? "PASS" : "INFO"}: ${subscriptions.length} perangkat CS aktif berlangganan push.`);
  if (checks.some((check) => !check.ok)) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Pemeriksaan notifikasi CS gagal.");
  process.exitCode = 1;
});
