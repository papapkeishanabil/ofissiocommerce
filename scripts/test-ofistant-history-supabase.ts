import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
const root = process.cwd();
async function main() {
 const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
 const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
 const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
 assert.equal(new URL(url).hostname, "localhost"); assert.equal(new URL(url).port, "18012");
 async function api(path: string, body?: unknown, method?: string, bearer = key, apiKey = key) {
  const response = await fetch(url+path, { method: method ?? (body === undefined ? "GET" : "POST"), headers: { apikey:apiKey,Authorization:`Bearer ${bearer}`,"Content-Type":"application/json",Prefer:"return=representation" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  if (!response.ok) throw new Error(`Preview fixture API ${path.split("?")[0]} failed: ${response.status}`);
  return text ? JSON.parse(text) : null;
 }
 const identity = await api("/rest/v1/rpc/ofissio_preview_identity",{}); assert.ok(identity.marker);
 const { middleware } = await import(root+"/src/middleware.ts");
 const { POST } = await import(root+"/src/app/api/ofistant/chat/route.ts");
 const { GET } = await import(root+"/src/app/api/ofistant/history/route.ts");
 const fixtures: {auth:string;profile:string;company:string;email:string;password:string;access:string;refresh:string}[]=[];
 async function fixture() {
  const suffix=randomUUID();const email=`ofistant-history-${suffix}@example.invalid`;const password=randomBytes(24).toString("base64url");
  const auth=await api("/auth/v1/admin/users",{email,password,email_confirm:true,user_metadata:{full_name:"Synthetic History Customer"}});
  const profile=randomUUID(),company=randomUUID();
  const item={auth:auth.id,profile,company,email,password,access:"",refresh:""};fixtures.push(item);
  await api("/rest/v1/companies",{id:company,name:"Synthetic History Preview",status:"active"});
  await api("/rest/v1/user_profiles",{id:profile,auth_user_id:auth.id,name:"Synthetic History Customer",email,whatsapp:"080000000000",status:"active"});
  await api("/rest/v1/company_memberships",{id:randomUUID(),company_id:company,user_profile_id:profile,auth_user_id:auth.id,role:"customer_admin",status:"active",joined_at:new Date().toISOString()});
  await api("/rest/v1/company_users",{id:randomUUID(),company_id:company,user_id:profile,role:"company_admin",status:"active"});
  const login=await api("/auth/v1/token?grant_type=password",{email,password},"POST",anon,anon);item.access=login.access_token;item.refresh=login.refresh_token;assert.ok(item.access);return item;
 }
 async function request(path:string,token?:string,body?:unknown) {
  const headers=new Headers({host:"localhost:8068",origin:"http://localhost:8068","Content-Type":"application/json"});
  if(token) headers.set("cookie",`ofissio_access_token=${token}`);
  const req=new NextRequest("http://localhost:8068"+path,{method:body?"POST":"GET",headers,body:body?JSON.stringify(body):undefined});
  const result=await middleware(req);
  for(const [name,value] of result.headers) if(name.startsWith("x-middleware-request-")) headers.set(name.slice("x-middleware-request-".length),value);
  const verified=new Request(req.url,{method:req.method,headers,body:body?JSON.stringify(body):undefined});
  return body?POST(verified):GET(verified);
 }
 try {
  const a=await fixture(),b=await fixture();const conversationId=randomUUID();const turnId=randomUUID();
  const body={message:"halo",context:{},cart:{itemCount:0,totalQty:0,totalEstimatedPrice:0},history:[],conversationId,turnId};
  const reply=await request("/api/ofistant/chat",a.access,body);assert.equal(reply.status,200);const result=await reply.json();assert.equal(result.historySaved,true);
  const read=await request(`/api/ofistant/history?conversationId=${conversationId}`,a.access);assert.equal(read.status,200);assert.equal((await read.json()).result.messages.length,2);
  assert.equal((await request(`/api/ofistant/history?conversationId=${conversationId}`,b.access)).status,404);
  assert.equal((await request("/api/ofistant/history",undefined)).status,401);
  const relogin=await api("/auth/v1/token?grant_type=password",{email:a.email,password:a.password},"POST",anon,anon);
  const secondDevice=await request(`/api/ofistant/history?conversationId=${conversationId}`,relogin.access_token);assert.equal(secondDevice.status,200);
  assert.equal((await secondDevice.json()).result.messages.length,2);
  await request("/api/ofistant/chat",a.access,body);
  const retryRead=await request(`/api/ofistant/history?conversationId=${conversationId}`,a.access);assert.equal((await retryRead.json()).result.messages.length,2);
  console.log(JSON.stringify({passed:true,realPreviewSupabaseAuth:true,realMiddleware:true,serverGeneratedReplySaved:true,reloginAndSecondDevice:true,otherCustomerDenied:true,anonymousDenied:true,idempotency:true,productionDatabaseTouched:false}));
 } finally {
  for(const f of fixtures) {
   await api(`/rest/v1/ofistant_conversations?user_id=eq.${f.profile}`,undefined,"DELETE");
   await api(`/rest/v1/company_memberships?auth_user_id=eq.${f.auth}`,undefined,"DELETE");
   await api(`/rest/v1/company_users?user_id=eq.${f.profile}`,undefined,"DELETE");
   await api(`/rest/v1/user_profiles?id=eq.${f.profile}`,undefined,"DELETE");
   await api(`/rest/v1/companies?id=eq.${f.company}`,undefined,"DELETE");
   await api(`/auth/v1/admin/users/${f.auth}`,undefined,"DELETE");
  }
 }
}
main().catch(()=>{console.error("Real preview history test failed; inspect controlled test stage without printing credentials.");process.exitCode=1;});
