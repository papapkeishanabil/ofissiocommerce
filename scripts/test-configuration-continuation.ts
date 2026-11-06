import assert from "node:assert/strict";
import { onConfigurationLogin, readConfigurationLogin, rememberConfigurationLogin, restoreConfigurationLoginScroll } from "../src/features/auth/configuration-continuation";
import { useUIStore } from "../src/stores/ui-store";

const saved=new Map<string,string>();const events=new EventTarget();const frames:FrameRequestCallback[]=[];
const location=new URL("https://fixture.test/product/kemeja?next=%2Fcart");
const scroller={scrollTop:420};let anchorTop=140;
const fakeWindow={location,scrollY:0,scrollTo:()=>{},addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events),dispatchEvent:events.dispatchEvent.bind(events)};
Object.defineProperty(globalThis,"window",{configurable:true,value:fakeWindow});
Object.defineProperty(globalThis,"document",{configurable:true,value:{querySelector:(selector:string)=>selector==="[data-workspace-scroll]"?scroller:{getBoundingClientRect:()=>({top:anchorTop})}}});
Object.defineProperty(globalThis,"sessionStorage",{configurable:true,value:{getItem:(key:string)=>saved.get(key)??null,setItem:(key:string,value:string)=>saved.set(key,value),removeItem:(key:string)=>saved.delete(key)}});
Object.defineProperty(globalThis,"requestAnimationFrame",{configurable:true,value:(callback:FrameRequestCallback)=>{frames.push(callback);return frames.length;}});

const unbind=onConfigurationLogin(state=>{
  state.embroidery={productId:"p-fixture",open:true,zone:"right_chest",dirty:true,textDirty:false,draft:{kind:"logo",sizing:"customer",width:"7",height:"4",notes:"Di atas saku kanan.",logo:{fileId:"saved-file",fileName:"logo.png",previewUrl:"blob:temporary"}}};
});
assert.equal(rememberConfigurationLogin(),"/product/kemeja?next=%2Fcart");
assert.equal(readConfigurationLogin()?.embroidery?.zone,"right_chest");
assert.equal(readConfigurationLogin()?.embroidery?.draft.notes,"Di atas saku kanan.");
assert(![...saved.values()][0]?.includes("blob:temporary"),"Browser blob URLs must not survive OAuth");

useUIStore.getState().openAuth({kind:"none"});
const intent=useUIStore.getState().authIntent;
assert.equal(intent.kind,"save_configuration");
assert(intent.kind==="save_configuration" && intent.returnTo==="/product/kemeja?next=%2Fcart");
useUIStore.getState().openAuth({kind:"checkout"});assert.equal(useUIStore.getState().authIntent.kind,"checkout");
useUIStore.getState().openAuth({kind:"request_quote",returnTo:"/quotes/quo_fixture"});assert.equal(useUIStore.getState().authIntent.kind,"request_quote");

location.pathname="/product/other";assert.equal(readConfigurationLogin(),null,"Never restore onto a different product");location.pathname="/product/kemeja";
const key="ofissio-configuration-login-v1";const value=saved.get(key)!;
const expired=JSON.parse(value);expired.createdAt=Date.now()-31*60*1000;saved.set(key,JSON.stringify(expired));assert.equal(readConfigurationLogin(),null);
saved.set(key,"bad-json");assert.equal(readConfigurationLogin(),null);
saved.set(key,value);anchorTop=230;restoreConfigurationLoginScroll();while(frames.length)frames.shift()!(0);
assert.equal(scroller.scrollTop,510,"Restore the anchor offset inside the storefront's nested scroller");assert.equal(saved.has(key),false);
rememberConfigurationLogin();let restored=false;const cancel=restoreConfigurationLoginScroll();cancel?.();const initial=scroller.scrollTop;while(frames.length){frames.shift()!(0);restored=scroller.scrollTop!==initial;}assert(!restored);
unbind();
console.log("PASS: configuration login captures draft, strips transient URLs, preserves product return path, keeps checkout/quote intents, ignores stale/corrupt/cross-product data, restores nested scrolling, and supports cleanup.");
