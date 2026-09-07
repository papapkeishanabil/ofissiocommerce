import assert from "node:assert/strict";
import { classifyPersistedMediaEvidence } from "../src/features/product-integrity-repair/product-integrity-repair.service";
import type { IntegrityRepairRow } from "../src/features/product-integrity-repair/product-integrity-repair.types";

function row():IntegrityRepairRow{return{id:"media:1",repair:"LEGACY_MEDIA",productId:1,sku:"TG-033",product:"Jaket",sourceId:"10",current:"2 permanent images",target:"3 expected source images",confidence:"NONE",classification:"BLOCKED",reason:"source unavailable",evidence:[]};}

const verified=row();
classifyPersistedMediaEvidence(verified,[{id:11},{id:12}],{status:"VERIFIED",orderedVerified:true,verifiedWooImageIds:[11,12],expectedImages:[{sourceIdentity:"a",normalizedFilename:"a.webp",targetMediaId:11,order:0},{sourceIdentity:"b",normalizedFilename:"b.webp",targetMediaId:12,order:1}]});
assert.equal(verified.classification,"VERIFIED_MEDIA_COMPLETE");

const countOnly=row();classifyPersistedMediaEvidence(countOnly,[{id:11},{id:12}],undefined);assert.equal(countOnly.classification,"MEDIA_EVIDENCE_REVIEW_REQUIRED");
const incomplete=row();classifyPersistedMediaEvidence(incomplete,[],undefined);assert.equal(incomplete.classification,"TARGET_MEDIA_INCOMPLETE");
const changedOrder=row();classifyPersistedMediaEvidence(changedOrder,[{id:12},{id:11}],{status:"VERIFIED",orderedVerified:true,verifiedWooImageIds:[11,12]});assert.equal(changedOrder.classification,"MEDIA_EVIDENCE_REVIEW_REQUIRED");

console.log("PASS: persisted ordered media evidence survives restart; image count alone remains review-required; incomplete targets remain blockers");
