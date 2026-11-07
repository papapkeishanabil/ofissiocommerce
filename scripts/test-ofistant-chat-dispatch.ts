import assert from "node:assert/strict";
import webpush from "web-push";

async function main() {
  process.env.DATABASE_PROVIDER = "supabase";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://chat-test.invalid";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service";
  const keys = webpush.generateVAPIDKeys();
  process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY = keys.publicKey;
  process.env.WEB_PUSH_VAPID_PRIVATE_KEY = keys.privateKey;
  process.env.WEB_PUSH_SUBJECT = "mailto:test@example.com";
  const notices: Record<string, unknown>[] = [];
  const deliveries: { endpoint: string; payload: string }[] = [];
  const subscriptions = [
    { id: "a", user_id: "sales-1", recipient_role: "sales", endpoint: "https://push.invalid/a", active: true },
    { id: "b", user_id: "super-1", recipient_role: "super_admin", endpoint: "https://push.invalid/b", active: true },
    { id: "c", user_id: "support-1", recipient_role: "support", endpoint: "https://push.invalid/c", active: true },
  ];
  const originalFetch = globalThis.fetch;
  const originalSend = webpush.sendNotification;
  webpush.sendNotification = (async (subscription, payload) => {
    deliveries.push({ endpoint: subscription.endpoint, payload: String(payload) });
    return { statusCode: 201, body: "", headers: {} };
  }) as typeof webpush.sendNotification;
  let reopened = false;
  globalThis.fetch = async (request, init) => {
    const url = new URL(String(request));
    assert.equal(url.hostname, "chat-test.invalid", "No real network permitted");
    const table = url.pathname.split("/").at(-1);
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    let result: unknown = [];
    if (table === "ofistant_support_messages") {
      if (url.searchParams.has("id")) {
        assert.equal(url.searchParams.get("role"), "eq.user");
        assert.equal(url.searchParams.get("is_context"), "eq.false");
        result = [{ id: url.searchParams.get("id")!.slice(3), body: "Halo, apakah ukuran XL tersedia?" }];
      } else if (url.searchParams.get("body")?.includes("dibuka kembali")) result = reopened ? [{ id: "reopen-1", sequence: 5 }] : [];
      else result = [{ id: "start-1", sequence: 1 }];
    } else if (table === "admin_notifications") {
      if (method === "POST") { const row = Array.isArray(body) ? body[0] : body; notices.push(row); result = [row]; }
      else if (method === "PATCH") { const row = notices.find((item) => `eq.${item.id}` === url.searchParams.get("id"))!; Object.assign(row, body); result = [row]; }
      else result = notices.filter((item) => !url.searchParams.has("entity_id") || `eq.${item.entity_id}` === url.searchParams.get("entity_id"));
    } else if (table === "admin_push_subscriptions") result = subscriptions;
    else throw new Error(`Unexpected table ${table}`);
    return Response.json(result);
  };
  try {
    const { notifyCustomerChat } = await import("../src/features/ofistant-support/support-notification.service");
    const conversation = { id: "df7bf95f-baf0-48ac-85dd-12164aff78a1", customerName: "PRIVATE NAME", status: "waiting" as const, staffId: null, staffName: null, updatedAt: new Date().toISOString() };
    const result = { conversation, messages: [], next: 0, more: false };
    await notifyCustomerChat("start", undefined, result);
    assert.equal(deliveries.length, 2);
    await notifyCustomerChat("start", undefined, result);
    assert.equal(deliveries.length, 2, "Repeated handoff must not resend push");
    await notifyCustomerChat("send", "message-1", { ...result, conversation: { ...conversation, status: "active", staffId: "sales-1" } });
    assert.equal(deliveries.length, 3);
    assert.equal(deliveries[2]!.endpoint, "https://push.invalid/a");
    await notifyCustomerChat("send", "message-1", result);
    assert.equal(deliveries.length, 3, "Repeated message must not resend push");
    reopened = true;
    await notifyCustomerChat("start", undefined, result);
    assert.equal(deliveries.length, 5, "Reopen is a new handoff event");
    await notifyCustomerChat("send", "message-2", { ...result, conversation: { ...conversation, status: "closed" } });
    assert.equal(deliveries.length, 5);
    const messagePush = JSON.parse(deliveries[2]!.payload);
    assert.equal(messagePush.title, "Pesan dari PRIVATE NAME");
    assert.equal(messagePush.body, "Halo, apakah ukuran XL tersedia?");
    assert(deliveries.every((item) => JSON.parse(item.payload).url === `/admin/chats?conversation=${conversation.id}`));
    console.log("PASS: persisted event -> notification -> Web Push, waiting/assigned routing, retry/reopen, privacy; zero real deliveries");
  } finally { globalThis.fetch = originalFetch; webpush.sendNotification = originalSend; }
}
void main();
