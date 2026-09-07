export type BulkReadinessLevel="READY"|"NEEDS_DATA"|"NEEDS_REVIEW"|"BLOCKED"|"SKIPPED_SPECIAL_PRODUCT";
export type BulkReadinessIssue={code:string;label:string;group:string;level:Exclude<BulkReadinessLevel,"READY"|"SKIPPED_SPECIAL_PRODUCT">};
export type BulkProductQa={
  productId:number;sku:string;name:string;wooStatus:string;productType:string;level:BulkReadinessLevel;dispositionReason:string|null;
  batchId:string|null;sourceId:string|null;sourceSku:string|null;targetSku:string|null;importStatus:string|null;
  expectedVariations:number|null;actualVariations:number;withoutSourceSku:number;preservedWithoutSku:number;wildcardVariations:number;
  imageCount:number;galleryCount:number;primaryImage:string|null;brokenImages:number;photoSource:string;potentialDuplicateMedia:number;
  categories:string[];industries:string[];moq:number;leadTime:string;fulfillment:string;transactionMode:string;
  materials:string[];sizes:string[];colors:string[];legacyColors:string[];descriptionIssue:boolean;externalDescriptionMedia:boolean;
  has3D:boolean;shippingComplete:boolean;quantityPricingState:string;capabilities:{embroidery:boolean;screenPrinting:boolean;dtf:boolean;embroideryZones:string[]};
  variantImages:Array<{hint:string;matchedValue:string|null;count:number}>;issues:BulkReadinessIssue[];
};
export type BulkProductQaReport={generatedAt:string;scope:string;batchId:string|null;products:BulkProductQa[];summary:Record<BulkReadinessLevel,number>&{total:number;scanned:number;specialProducts:number};issueCounts:Record<string,number>;imageSummary:{local:number;legacy:number;broken:number;missing:number;potentialDuplicates:number};variationSummary:{expected:number;actual:number;mismatchProducts:number;withoutSourceSku:number;preserved:number;blocked:number}};
