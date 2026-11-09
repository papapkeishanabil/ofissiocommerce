import assert from "node:assert/strict";

async function main() {
  process.env.DATABASE_PROVIDER = "supabase";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://admin-user-fixture.invalid";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "fixture-anon";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-service";
  process.env.AUTH_MODE = "development";
  process.env.INTERNAL_DEV_HEADERS_ENABLED = "false";
  const id = "11111111-1111-4111-8111-111111111111";
  const authId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const actorId = "22222222-2222-4222-8222-222222222222";
  const password = "Fixture-password-123";
  const initial = { id, auth_user_id: authId, name: "Staff Contoh", email: "staff@example.invalid", role: "sales", status: "active" };
  let profile: Record<string, unknown> | null = { ...initial };
  let customerLinked = false;
  let authFailure = false;
  let authAlreadyGone = false;
  const calls: { path: string; method: string; body?: Record<string, unknown> }[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.hostname, "admin-user-fixture.invalid", "Tests must never reach a real provider");
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ path: url.pathname, method, body });
    if (url.pathname.startsWith("/auth/v1/admin/users/")) {
      if (authFailure) return Response.json({ message: "fixture failure" }, { status: 500 });
      if (authAlreadyGone) return Response.json({ message: "fixture account already deleted" }, { status: 404 });
      return Response.json({ id: authId });
    }
    if (url.pathname === "/rest/v1/internal_user_profiles") {
      const match = profile && [...url.searchParams].every(([key, value]) => !value.startsWith("eq.") || String(profile![key]) === value.slice(3));
      if (method === "PATCH" && match) profile = { ...profile, ...body };
      if (method === "DELETE" && match) { const removed = profile;profile = null;return Response.json([removed]); }
      return Response.json(match && profile ? [profile] : []);
    }
    if (url.pathname === "/rest/v1/user_profiles" || url.pathname === "/rest/v1/company_memberships") return Response.json(customerLinked ? [{ id: "customer-fixture" }] : []);
    if (url.pathname === "/rest/v1/audit_logs") return Response.json([]);
    throw new Error("Unexpected fixture request: " + url.pathname);
  };
  try {
    const service = await import("../src/features/admin-users/admin-user.service");
    const validation = await import("../src/features/admin-users/admin-user.validation");
    const route = await import("../src/app/api/admin/users/[id]/route");
    const passwordRoute = await import("../src/app/api/admin/users/[id]/password/route");
    const updated = await service.updateManagedInternalUser({ id, actorId, name: "Nama Baru" });
    assert.equal(updated.name, "Nama Baru");
    assert.ok(!calls.some(call => call.path.startsWith("/auth/")), "Editing name must not mutate credentials");
    await service.changeManagedInternalUserPassword({ id, actorId, password });
    assert.deepEqual(calls.find(call => call.method === "PUT")?.body, { password });
    assert.equal(profile?.name, "Nama Baru");
    assert.equal(validation.updateInternalUserSchema.safeParse({ password }).success, false);
    assert.equal(validation.updateInternalUserSchema.safeParse({}).success, false);
    assert.equal(validation.internalUserPasswordSchema.safeParse({ password, confirmPassword: "different-password" }).success, false);
    assert.equal(validation.internalUserPasswordSchema.safeParse({ password: "short", confirmPassword: "short" }).success, false);

    await assert.rejects(service.deleteManagedInternalUser({ id, actorId: id, confirmEmail: initial.email }));
    await assert.rejects(service.deleteManagedInternalUser({ id, actorId: authId, confirmEmail: initial.email }));
    await assert.rejects(service.updateManagedInternalUser({ id, actorId: id, status: "inactive" }));
    await service.updateManagedInternalUser({ id, actorId: id, name: "Nama sendiri" });
    const beforeBlocked = calls.filter(call => call.method === "DELETE").length;
    await assert.rejects(service.deleteManagedInternalUser({ id, actorId, confirmEmail: "wrong@example.invalid" }));
    customerLinked = true;
    await assert.rejects(service.deleteManagedInternalUser({ id, actorId, confirmEmail: initial.email }));
    assert.equal(profile?.status, "active");
    assert.equal(calls.filter(call => call.method === "DELETE").length, beforeBlocked);
    customerLinked = false;
    profile = { ...initial, role: "super_admin" };
    await assert.rejects(service.deleteManagedInternalUser({ id, actorId, confirmEmail: initial.email }));
    await assert.rejects(service.updateManagedInternalUser({ id, actorId, status: "inactive" }));
    await assert.rejects(service.changeManagedInternalUserPassword({ id, actorId, password }));
    await service.changeManagedInternalUserPassword({ id, actorId: id, password });

    profile = { ...initial };
    authFailure = true;
    await assert.rejects(service.deleteManagedInternalUser({ id, actorId, confirmEmail: initial.email }));
    assert.equal(profile?.status, "inactive", "Failed auth deletion must still revoke internal access");
    assert.ok(profile, "Profile retained for retry after provider failure");
    authFailure = false;
    authAlreadyGone = true;
    await service.deleteManagedInternalUser({ id, actorId, confirmEmail: initial.email });
    authAlreadyGone = false;
    assert.equal(profile, null);
    const deletions = calls.filter(call => call.method === "DELETE" && call.path.startsWith("/auth/"));
    assert.deepEqual(deletions.at(-1)?.body, { should_soft_delete: true }, "Never cascade-delete auth identity and business references");
    const context = { params: Promise.resolve({ id }) };
    const makeRequest = (method: string, body: unknown, role?: string) => new Request("https://ofissio.test/api/admin/users/" + id, {
      method, headers: { "Content-Type": "application/json", ...(role ? { "x-ofissio-auth-verified": "1", "x-ofissio-auth-kind": "internal", "x-ofissio-internal-role": role, "x-ofissio-internal-user-id": actorId } : {}) }, body: JSON.stringify(body),
    });
    assert.equal((await route.PATCH(makeRequest("PATCH", { name: "Denied" }), context)).status, 403);
    assert.equal((await route.DELETE(makeRequest("DELETE", { confirmEmail: initial.email }, "sales"), context)).status, 403);
    assert.equal((await passwordRoute.POST(makeRequest("POST", { password, confirmPassword: password }, "sales"), context)).status, 403);
    profile = { ...initial };
    const passwordResponse = await passwordRoute.POST(makeRequest("POST", { password, confirmPassword: password }, "super_admin"), context);
    assert.equal(passwordResponse.status, 200);
    assert.deepEqual(await passwordResponse.json(), { ok: true });
    assert.equal((await route.PATCH(makeRequest("PATCH", { name: "Staff diperbarui" }, "super_admin"), context)).status, 200);
    assert.equal((await route.PATCH(makeRequest("PATCH", { role: "super_admin" }, "super_admin"), context)).status, 400);
    assert.equal((await route.DELETE(makeRequest("DELETE", { confirmEmail: "wrong@example.invalid" }, "super_admin"), context)).status, 400);
    assert.equal((await route.DELETE(makeRequest("DELETE", { confirmEmail: initial.email }, "super_admin"), context)).status, 200);
    assert.equal(profile, null);
    assert.ok(!JSON.stringify(calls.filter(call => call.path.includes("audit"))).includes(password), "Audit records must never contain passwords");
    console.log("PASS admin users: names, password isolation/validation, self/system protection, customer links, deletion retry/failure, soft auth deletion, API permissions and password-free audit.");
  } finally { globalThis.fetch = originalFetch; }
}
main().catch(error => { console.error(error);process.exitCode = 1; });
