import assert from "node:assert/strict";
import { CUSTOMER_ORDER_STAGES, customerStageId, getCustomerOrderStages } from "../src/features/tracking/customer-order-stages";
import { buildTimeline, STAGE_TEMPLATES, trackingOrderStatusLabel } from "../src/features/tracking/tracking-utils";
import type { CustomerTrackingOrder, TrackingFulfillmentType } from "../src/features/tracking/tracking.types";

function order(id: string, type: TrackingFulfillmentType = "READY_STOCK") {
  return { currentStageId:id, fulfillmentType:type, paymentStatus:id === "waiting_payment" ? "waiting_payment" : "paid", documents:[], productionTimeline:buildTimeline(type,id,{currentCompletedQty:4,currentTotalQty:10}) } as unknown as CustomerTrackingOrder;
}

const expected = [0,1,1,1,2,2,3,4,4] as const;
for (const [index, internal] of STAGE_TEMPLATES.READY_STOCK.entries()) {
  const input=order(internal.id);
  const before=JSON.stringify(input);
  const stages=getCustomerOrderStages(input);
  const phase=expected[index]!;
  assert.deepEqual(stages.map(stage=>stage.label), CUSTOMER_ORDER_STAGES.map(stage=>stage.label));
  assert.equal(trackingOrderStatusLabel(input),CUSTOMER_ORDER_STAGES[phase].label);
  if (expected[index]===4) assert.ok(stages.every(stage=>stage.state==='completed'));
  else {
    assert.equal(stages.findIndex(stage=>stage.state==='current'),expected[index]);
    assert.ok(stages.slice(0,expected[index]).every(stage=>stage.state==='completed'));
    assert.ok(stages.slice(phase+1).every(stage=>stage.state==='pending'));
  }
  assert.equal(JSON.stringify(input),before,'Customer projection must not mutate internal tracking');
}

for (const type of ['READY_STOCK_WITH_CUSTOMIZATION','MADE_TO_ORDER'] as const) {
  for (const internal of STAGE_TEMPLATES[type]) assert.equal(getCustomerOrderStages(order(internal.id,type)).length,5);
}
const packing=order('packing');
assert.equal(getCustomerOrderStages(packing)[1]!.state,'current','Packing belongs to processing until packing finishes');
assert.equal(getCustomerOrderStages(packing)[1]!.completedQty,4);
packing.productionTimeline.find(stage=>stage.id==='packing')!.state='blocked';
assert.equal(getCustomerOrderStages(packing)[1]!.state,'blocked');
const paid=order('waiting_payment');paid.paymentStatus='paid';
assert.equal(getCustomerOrderStages(paid)[1]!.state,'current','Confirmed payment advances the customer view even before internal stage synchronization');
assert.equal(trackingOrderStatusLabel(paid),'Pesanan diproses');
const delivered=order('in_transit');delivered.actualDeliveredAt='2026-10-17T09:00:00Z';
assert.ok(getCustomerOrderStages(delivered).every(stage=>stage.state==='completed'));
assert.equal(getCustomerOrderStages(delivered)[4]!.completedAt,delivered.actualDeliveredAt);
assert.equal(trackingOrderStatusLabel(delivered),'Terkirim');
const quote=order('quotation_submitted','QUOTATION_ONLY');
assert.equal(getCustomerOrderStages(quote),quote.productionTimeline,'Quotation workflow stays separate');
assert.equal(customerStageId('awaiting_pickup'),'ready_to_ship');
assert.equal(customerStageId('completed'),'delivered');
console.log('PASS: five customer stages, all fulfillment types, payment handoff, packing/pickup grouping, delivery completion, quantities, blocking and immutable internal tracking.');
