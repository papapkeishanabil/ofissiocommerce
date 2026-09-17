import * as THREE from "three";

/** Fit the complete hierarchy once, preserving relative mesh transforms. */
export function fitGarmentModel(scene: THREE.Object3D, orientationY = 0) {
  const root = new THREE.Group();
  const oriented = new THREE.Group();
  oriented.rotation.y = THREE.MathUtils.degToRad(orientationY);
  oriented.add(scene.clone(true));
  root.add(oriented);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = 1.76 / Math.max(size.x, size.y, size.z, 0.001);
  root.scale.setScalar(scale);
  root.position.copy(center).multiplyScalar(-scale);
  root.updateMatrixWorld(true);
  return root;
}
