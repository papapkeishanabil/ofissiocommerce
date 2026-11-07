import assert from "node:assert/strict";
import { chatRequest, ChatRequestError } from "../src/features/ofistant-support/support-request";

const result = { conversation: null, messages: [], next: 0, more: false };
const session = { kind: "customer", session: { user: { id: "u" }, company: { id: "c" } } };
const original = globalThis.fetch;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
async function main() {
  let calls: string[] = []; let reads = 0; const bodies: string[] = [];
  globalThis.fetch = async (url, init) => {
    calls.push(String(url));
    if (url === "/api/auth/session") return json({ session });
    bodies.push(String(init?.body));
    return ++reads === 1 ? json({},401) : json({ result });
  };
  const payload = { action:"send",messageId:"same-id",text:"Hello" };
  assert.deepEqual(await chatRequest("/api/ofistant/support",payload,"u:c"),result);
  assert.equal(calls.length,3);assert.equal(bodies[0],bodies[1]);

  for (const invalid of [null,{kind:"internal"},{kind:"customer",session:{user:{id:"other"},company:{id:"c"}}}]) {
    calls=[];
    globalThis.fetch=async url=>{calls.push(String(url));return url==="/api/auth/session" ? json({session:invalid}) : json({},401);};
    await assert.rejects(chatRequest("/api/ofistant/support",payload,"u:c"),e=>e instanceof ChatRequestError && e.status===401);
    assert.equal(calls.length,2,"Never replay a mutation for another account");
  }
  calls=[];
  globalThis.fetch=async url=>{calls.push(String(url));return url==="/api/auth/session" ? json({session}) : json({},401);};
  await assert.rejects(chatRequest("/api/ofistant/support",undefined,"u:c"));assert.equal(calls.length,3,"Bound retries");
  calls=[];
  globalThis.fetch=async url=>{calls.push(String(url));return json({},403);};
  await assert.rejects(chatRequest("/api/ofistant/support",undefined,"u:c"));assert.equal(calls.length,1,"Do not refresh forbidden requests");
  let checks=0;reads=0;
  globalThis.fetch=async url=>{if(url==="/api/auth/session"){checks++;await new Promise(r=>setTimeout(r,20));return json({session});} return ++reads<=2 ? json({},401):json({result});};
  await Promise.all([chatRequest("/api/ofistant/support",undefined,"u:c"),chatRequest("/api/ofistant/support",undefined,"u:c")]);assert.equal(checks,1);
  console.log("PASS: recover session, preserve message ID, reject changed accounts, bound retries, share refresh");
}
main().finally(()=>{globalThis.fetch=original;}).catch(error=>{console.error(error);process.exitCode=1;});
