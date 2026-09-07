import assert from "node:assert/strict";
import fs from "node:fs";
import { reconcileLegacyMediaState } from "../src/features/product-integrity-repair/product-integrity-repair.service";

const urls=["https://www.ofissio.com/a.jpg","https://www.ofissio.com/b.jpg","https://www.ofissio.com/c.jpg"];
const media=(index:number)=>({id:840+index,sourceUrl:`http://localhost:10010/uploads/${["a","b","c"][index-1]}.webp`,alt:"",title:""});
const matches=(count:number)=>urls.map((url,index)=>({url,media:index<count?[media(index+1)]:[]}));
const images=(count:number)=>Array.from({length:count},(_,index)=>({id:841+index,src:`http://localhost:10010/uploads/${["a","b","c"][index]}.webp`}));

const none=reconcileLegacyMediaState({sourceUrls:urls,productImages:[],mediaMatches:matches(0)});
assert.equal(none.uploadsRequired,3);assert.equal(none.reusableMedia,0);assert.equal(none.state,"MISSING_MEDIA");

const wpPartial=reconcileLegacyMediaState({sourceUrls:urls,productImages:[],mediaMatches:matches(2)});
assert.equal(wpPartial.reusableMedia,2);assert.equal(wpPartial.uploadsRequired,1);assert.equal(wpPartial.missing,1);assert.equal(wpPartial.alreadyAttached,0);assert.equal(wpPartial.state,"PARTIAL_MEDIA_STATE");

const attachedPartial=reconcileLegacyMediaState({sourceUrls:urls,productImages:images(2),mediaMatches:matches(2)});
assert.equal(attachedPartial.reusableMedia,2);assert.equal(attachedPartial.uploadsRequired,1);assert.equal(attachedPartial.alreadyAttached,2);assert.equal(attachedPartial.state,"PARTIAL_MEDIA_STATE");

const allReusable=reconcileLegacyMediaState({sourceUrls:urls,productImages:[],mediaMatches:matches(3)});
assert.equal(allReusable.uploadsRequired,0);assert.equal(allReusable.alreadyAttached,0);assert.equal(allReusable.missing,0);assert.equal(allReusable.state,"PARTIAL_MEDIA_STATE");

const healthy=reconcileLegacyMediaState({sourceUrls:urls,productImages:images(3),mediaMatches:matches(3)});
assert.equal(healthy.state,"ALREADY_HEALTHY");assert.equal(healthy.orderedTargetVerified,true);assert.equal(healthy.uploadsRequired,0);

const retryDryRun=reconcileLegacyMediaState({sourceUrls:urls,productImages:[],mediaMatches:matches(2)});
assert.deepEqual(retryDryRun,wpPartial,"a failed/partial execution must remain stable in the next dry run");

const ambiguous=reconcileLegacyMediaState({sourceUrls:urls.slice(0,1),productImages:[],mediaMatches:[{url:urls[0]!,media:[media(1),{...media(1),id:999}]}]});
assert.equal(ambiguous.deterministic,false);assert.equal(ambiguous.state,"AMBIGUOUS_MEDIA_STATE");assert.equal(ambiguous.items[0]?.action,"BLOCKED_AMBIGUOUS");

const plannerSource=fs.readFileSync("src/features/product-integrity-repair/product-integrity-repair.service.ts","utf8");
const importDryRunSource=fs.readFileSync("src/features/product-import/product-import-dry-run.service.ts","utf8");
assert.match(importDryRunSource,/legacySourceImages/,"future import plans must persist deterministic source identities");
assert.match(plannerSource,/planned\.legacySourceImages/,"repair dry run must reuse persisted source evidence after restart/failure");
assert.equal(plannerSource.includes("product_integrity_repaired"),false,"repair lifecycle/audit result must not hide rows from a later dry run");

console.log("PASS: legacy media planner covers missing, partial WP, partial attached, reusable-only, healthy, retry persistence, and ambiguous identity");
