import assert from "node:assert/strict";
import * as THREE from "three";
import { fitGarmentModel } from "../src/components/configurator/fit-garment-model";
import { garmentReference, modelUnitsPerCm } from "../src/components/configurator/garment-scale";
import { offsetToModelPosition, placementOffsetCm, placementModelAxis } from "../src/components/configurator/placement-controls";
import { EMBROIDERY_ZONES, type LogoPlacement } from "../src/types/uniform-3d";
import { ZONE_ANCHORS } from "../src/data/uniform-3d";

// Nested, translated multi-mesh exports must keep proportions and fit as one.
const scene = new THREE.Group();
scene.position.set(10, 20, 30);
const inner = new THREE.Group();
inner.scale.setScalar(2);
scene.add(inner);
const first = new THREE.Mesh(new THREE.BoxGeometry(2, 8, 1));
const second = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1));
second.position.set(3, 1, 0);
inner.add(first, second);
const before = new THREE.Box3().setFromObject(scene);
const fitted = fitGarmentModel(scene);
const after = new THREE.Box3().setFromObject(fitted);
const size = after.getSize(new THREE.Vector3());
assert.ok(Math.abs(size.y - 1.76) < 1e-9);
assert.ok(after.getCenter(new THREE.Vector3()).length() < 1e-9);
assert.deepEqual(new THREE.Box3().setFromObject(scene), before, "Original GLTF scene must be unchanged");
assert.ok(Math.abs(size.x / size.y - before.getSize(new THREE.Vector3()).x / before.getSize(new THREE.Vector3()).y) < 1e-9);

const reference = garmentReference("kl-007")!;
assert.deepEqual(reference, { size: "L", lengthCm: 70, chestWidthCm: 52, shoulderWidthCm: 45 });
assert.equal(garmentReference("KK-006"), undefined);
const units = modelUnitsPerCm(size.y, reference.lengthCm);
assert.ok(Math.abs(7 * units / size.y - .1) < 1e-9, "7cm is 10% of the 70cm reference height");
assert.ok(7 * units < 7 * .03, "Correct inflated legacy logo size");
assert.equal(modelUnitsPerCm(1.76), .03);
assert.equal(modelUnitsPerCm(NaN, 70), .03);

for (const zone of EMBROIDERY_ZONES) {
  for (const axis of ["x", "y"] as const) {
    for (const cm of [-4, 0, 2, 7]) {
      const anchor = ZONE_ANCHORS[zone];
      const point: [number, number, number] = [anchor.x, anchor.y, anchor.z];
      const modelAxis = placementModelAxis(zone, axis);
      point[modelAxis === "x" ? 0 : modelAxis === "y" ? 1 : 2] = offsetToModelPosition(zone, axis, cm, units);
      assert.equal(placementOffsetCm({ zone, surfacePoint: point } as LogoPlacement, axis, units), cm);
    }
  }
}
console.log("Garment scale: hierarchy, reference scope, logo ratio and all-zone offset round trips passed.");
