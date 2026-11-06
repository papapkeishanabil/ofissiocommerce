import { z } from "zod";
import { embroideryPlacementSchema, logoPlacementSchema, uniform3DConfigSchema } from "@/schemas/uniform-3d";
import { EMBROIDERY_ZONES } from "@/types/uniform-3d";

const KEY = "ofissio-configuration-login-v1";
const MAX_AGE_MS = 30 * 60 * 1000;
const EVENT = "ofissio:configuration-login";
const textSchema = logoPlacementSchema.shape.textBordir;
const draftSchema = z.object({
  kind:z.enum(["logo","text"]),
  logo:z.object({fileId:z.string(),fileName:z.string(),previewUrl:z.string().optional()}).optional(),
  text:textSchema,
  sizing:z.enum(["ofissio","customer"]),width:z.string(),height:z.string(),notes:z.string().max(240),
});
const stateSchema = z.object({
  version:z.literal(1),returnTo:z.string(),createdAt:z.number(),
  scroll:z.object({windowTop:z.number(),workspaceTop:z.number().optional(),anchorTop:z.number().optional()}),
  product:z.object({
    productId:z.string(),color:z.string(),sizes:z.record(z.number()),selectedOptions:z.record(z.string()),selectedSleeve:z.string(),customization:z.string(),
    placements:z.array(embroideryPlacementSchema).max(6),config:uniform3DConfigSchema.nullable(),editingLineId:z.string().optional(),
  }).optional(),
  embroidery:z.object({productId:z.string(),open:z.boolean(),zone:z.enum(EMBROIDERY_ZONES).nullable(),draft:draftSchema,dirty:z.boolean(),textDirty:z.boolean()}).optional(),
});
export type ConfigurationContinuation = z.infer<typeof stateSchema>;
export type EmbroideryLoginDraft = z.infer<typeof draftSchema>;

function currentPath() { return window.location.pathname + window.location.search; }

/** Capture listeners only run on the current page; no credentials or session tokens are stored. */
export function rememberConfigurationLogin() {
  if (typeof window === "undefined") return undefined;
  const scroller = document.querySelector<HTMLElement>("[data-workspace-scroll]");
  const anchor = document.querySelector<HTMLElement>("[data-configuration-editor]");
  const state:ConfigurationContinuation = {version:1,returnTo:currentPath(),createdAt:Date.now(),scroll:{windowTop:window.scrollY,workspaceTop:scroller?.scrollTop,anchorTop:anchor?.getBoundingClientRect().top}};
  window.dispatchEvent(new CustomEvent(EVENT,{detail:state}));
  try {
    sessionStorage.setItem(KEY,JSON.stringify(state,(key,value) =>
      ["logoPreviewUrl","previewUrl"].includes(key) && typeof value === "string" && value.startsWith("blob:") ? undefined : value));
  } catch { /* The modal can still keep its live state when browser storage is unavailable. */ }
  return state.returnTo;
}

export function onConfigurationLogin(capture:(state:ConfigurationContinuation)=>void) {
  const handler=(event:Event)=>capture((event as CustomEvent<ConfigurationContinuation>).detail);
  window.addEventListener(EVENT,handler);
  return ()=>window.removeEventListener(EVENT,handler);
}

export function readConfigurationLogin() {
  if (typeof window === "undefined") return null;
  try {
    const parsed=stateSchema.safeParse(JSON.parse(sessionStorage.getItem(KEY) ?? "null"));
    if (!parsed.success) return null;
    const state=parsed.data;const age=Date.now()-state.createdAt;
    if(age<0 || age>MAX_AGE_MS || state.returnTo!==currentPath()) return null;
    return state;
  } catch { return null; }
}

/** Restore the nested storefront scroller after auth has closed and forms have re-mounted. */
export function restoreConfigurationLoginScroll() {
  const state=readConfigurationLogin();
  if(!state) return;
  let frame=0;let cancelled=false;
  const restore=()=>{
    if(cancelled)return;
    if(++frame<4){requestAnimationFrame(restore);return;}
    const scroller=document.querySelector<HTMLElement>("[data-workspace-scroll]");
    const anchor=document.querySelector<HTMLElement>("[data-configuration-editor]");
    const delta=anchor && state.scroll.anchorTop!=null ? anchor.getBoundingClientRect().top-state.scroll.anchorTop : null;
    if(scroller) scroller.scrollTop=delta!=null ? scroller.scrollTop+delta : state.scroll.workspaceTop ?? scroller.scrollTop;
    else window.scrollTo({top:delta!=null ? window.scrollY+delta : state.scroll.windowTop,behavior:"instant"});
    try {sessionStorage.removeItem(KEY);}catch{ /* No persistent state to clear. */ }
  };
  requestAnimationFrame(restore);
  return ()=>{cancelled=true;};
}
