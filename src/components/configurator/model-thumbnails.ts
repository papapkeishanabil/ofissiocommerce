import { garmentLightingForColor, garmentLightAzimuth } from "./garment-lighting";
import * as THREE from "three";
import { CAMERA_PRESETS, type CameraPreset } from "@/types/uniform-3d";
import { CAMERA_PRESET_VIEWS } from "@/data/uniform-3d";

/** Render the actual loaded garment using the existing WebGL context.
 * No extra viewers, catalog-image guesses, uploads, or stored cart snapshots.
 */
export function renderModelThumbnails(renderer: THREE.WebGLRenderer, garment: THREE.Object3D, fabricColor?: string) {
  const lighting = garmentLightingForColor(fabricColor);
  const size = 192;
  const scene = new THREE.Scene();
  const model = garment.clone(true);
  scene.add(model, new THREE.AmbientLight(0xffffff, lighting.ambient), new THREE.HemisphereLight(0xffffff, 0xcbd5e1, lighting.hemisphere));
  const key = new THREE.DirectionalLight(0xffffff, lighting.key);
  key.position.set(3, 5, 4);
  const fill = new THREE.DirectionalLight(0xdbeafe, lighting.fill);
  fill.position.set(-4, 2, -3);
  const lights = new THREE.Group();
  lights.add(key, fill);
  scene.add(lights);
  const target = new THREE.WebGLRenderTarget(size, size);
  target.texture.colorSpace = THREE.SRGBColorSpace;
  const previousTarget = renderer.getRenderTarget();
  const previousColor = renderer.getClearColor(new THREE.Color());
  const previousAlpha = renderer.getClearAlpha();
  const pixels = new Uint8Array(size * size * 4);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) { target.dispose(); return {}; }
  const result: Partial<Record<CameraPreset, string>> = {};
  try {
    renderer.setClearColor(0x071c3a, 0);
    for (const preset of CAMERA_PRESETS) {
      const view = CAMERA_PRESET_VIEWS[preset] ?? CAMERA_PRESET_VIEWS.front!;
      const camera = new THREE.PerspectiveCamera(34, 1, .01, 100);
      camera.position.set(...view.position);
      camera.lookAt(...view.target);
      camera.updateMatrixWorld();
      lights.rotation.y = garmentLightAzimuth(fabricColor, camera.position.x, camera.position.z);
      renderer.setRenderTarget(target);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.readRenderTargetPixels(target, 0, 0, size, size, pixels);
      const image = context.createImageData(size, size);
      for (let row = 0; row < size; row++) {
        const start = (size - row - 1) * size * 4;
        image.data.set(pixels.subarray(start, start + size * 4), row * size * 4);
      }
      context.putImageData(image, 0, 0);
      result[preset] = canvas.toDataURL("image/png");
    }
  } finally {
    renderer.setRenderTarget(previousTarget);
    renderer.setClearColor(previousColor, previousAlpha);
    target.dispose();
    scene.clear(); // Shared garment geometries/textures still belong to the viewer.
  }
  return result;
}
