import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createAboutUsDraft } from "../src/features/page-builder/page.defaults";
// CSS modules are browser/build concerns; this test checks the art-direction contract.
const require=createRequire(import.meta.url);
require.extensions[".css"]=(module)=>{module.exports={__esModule:true,default:new Proxy({}, {get:(_target,key)=>String(key)})};};
async function main(){
 const {PageRenderer}=await import("../src/features/page-builder/PageRenderer");
 const document=createAboutUsDraft();
 document.sections[0]!.images[0]!.mobileSrc="/about-us/mobile-test.png";
 const mobile=renderToStaticMarkup(createElement(PageRenderer,{document,previewDevice:"mobile"}));
 const desktop=renderToStaticMarkup(createElement(PageRenderer,{document,previewDevice:"desktop"}));
 const publicPage=renderToStaticMarkup(createElement(PageRenderer,{document}));
 assert.ok(mobile.includes('media="all" srcSet="/about-us/mobile-test.png"'));
 assert.ok(desktop.includes('media="not all" srcSet="/about-us/mobile-test.png"'));
 assert.ok(publicPage.includes('media="(max-width:850px)" srcSet="/about-us/mobile-test.png"'));
 assert.ok(mobile.includes("Ilustrasi"));
 document.sections[0]!.visible=false;
 const hidden=renderToStaticMarkup(createElement(PageRenderer,{document}));assert.ok(!hidden.includes('data-page-section="hero"'));
 console.log("PASS renderer: desktop/mobile asset selection, public media queries, illustration labels and section visibility.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
