import assert from "node:assert/strict";
import { classifyProductImportHistory, countProductImportItemStatuses } from "../src/features/product-import/product-import-history";

assert.equal(classifyProductImportHistory({status:"COMPLETED",failedItems:0,verifiedStaging:false}),"FINAL");
assert.equal(classifyProductImportHistory({status:"COMPLETED_WITH_WARNINGS",failedItems:3,verifiedStaging:true}),"RETRYABLE_FAILED_ITEMS");
assert.equal(classifyProductImportHistory({status:"COMPLETED_WITH_WARNINGS",failedItems:0,verifiedStaging:true}),"FINAL_WITH_WARNINGS");
assert.equal(classifyProductImportHistory({status:"PREVIEWED",failedItems:0,verifiedStaging:true}),"CONTINUE_IMPORT");
const counts=countProductImportItemStatuses([{batch_id:"prod",status:"IMPORTED"},{batch_id:"prod",status:"IMPORTED"},{batch_id:"prod",status:"FAILED"},{batch_id:"prod",status:"SKIPPED"}]);
assert.deepEqual(counts.get("prod"),{imported:2,failed:1,skipped:1,pending:0,uploading:0});
console.log("PASS: product import history workflow classification");
