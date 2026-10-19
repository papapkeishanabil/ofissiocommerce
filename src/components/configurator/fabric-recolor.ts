import * as THREE from "three";

/** Only explicitly prepared GLBs may use vertex alpha as a fabric mask. */
export function hasFabricMask(material: THREE.Material) {
  const config = material.userData.ofissioFabricRecolor;
  return config?.version === 1 && config?.mask === "vertex-alpha";
}

export const FABRIC_RECOLOR_GLSL = `
uniform vec3 ofissioFabricColor;
vec3 ofissioRecolorFabric(vec3 originalColor) {
  #ifdef USE_COLOR_ALPHA
    return mix(originalColor, originalColor * ofissioFabricColor, vColor.a);
  #else
    return originalColor;
  #endif
}
`;

export function updateFabricColor(root: THREE.Object3D, color: string) {
  const value = new THREE.Color(color);
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      if (!hasFabricMask(material)) continue;
      material.userData.ofissioFabricColor = value.clone();
      material.userData.ofissioColorGradeShader?.uniforms.ofissioFabricColor?.value.copy(value);
    }
  });
}
