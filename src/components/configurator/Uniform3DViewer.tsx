// src/components/configurator/Uniform3DViewer.tsx
// The actual R3F canvas. Lazy-loaded by the configurator (see
// Uniform3DConfigurator) so the three.js bundle never ships to product
// detail pages that don't open the 3D tab.

"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";

import type {
  CameraPreset,
  EmbroideryZone,
  LogoPlacement,
} from "@/types/uniform-3d";
import { CAMERA_PRESET_VIEWS, ZONE_ANCHORS, type Model3DEntry } from "@/data/uniform-3d";
import { resolveProduct3DUrl } from "@/features/products/product-3d-url.client";
import { ProceduralShirt } from "./ProceduralShirt";
import { garmentLightingForColor } from "./garment-lighting";
import { renderModelThumbnails } from "./model-thumbnails";
import { configureStudioGLTFLoader } from "./configure-gltf-loader";
import { fitGarmentModel } from "./fit-garment-model";
import { FABRIC_RECOLOR_GLSL, hasFabricMask, updateFabricColor } from "./fabric-recolor";
import { fabricColorForName } from "@/lib/product-colors";
import { modelUnitsPerCm } from "./garment-scale";
import {
  DEFAULT_MODEL_COLOR_ADJUSTMENT,
  normalizeModelColorAdjustment,
  type ModelColorAdjustment,
} from "@/types/model-color-adjustment";

interface Uniform3DViewerProps {
  onScaleReady?: (unitsPerCm: number) => void;
  model: Model3DEntry;
  color: string;
  fabricColor?: string;
  placements: LogoPlacement[];
  activeCamera: CameraPreset;
  highlightZone?: string | null;
  onCanvasReady?: (gl: { domElement: HTMLCanvasElement; captureFrame?: () => string }) => void;
  onModelReady?: () => void;
  onThumbnailsReady?: (thumbnails: Partial<Record<CameraPreset, string>>) => void;
  /** Raycast: customer klik surface → dapat posisi + normal untuk logo */
  onSurfaceClick?: (hit: { point: [number, number, number]; normal: [number, number, number] }) => void;
}

export function Uniform3DViewer({
  onScaleReady,
  model,
  color,
  fabricColor,
  placements,
  activeCamera,
  highlightZone,
  onCanvasReady,
  onModelReady,
  onThumbnailsReady,
  onSurfaceClick,
}: Uniform3DViewerProps) {
  const lighting = garmentLightingForColor(fabricColor ?? fabricColorForName(color));
  const view = CAMERA_PRESET_VIEWS[activeCamera] ?? CAMERA_PRESET_VIEWS.front!;
  const [resolvedGlbUrl, setResolvedGlbUrl] = useState<string | null>(() =>
    model.glbUrl?.startsWith("/api/products/woocommerce/") ? null : model.glbUrl ?? null,
  );
  const [resolverError, setResolverError] = useState(false);
  const controlsRef = useRef<any>(null);
  const zoomUntil = useRef(0);

  useEffect(() => {
    let active = true;
    setResolverError(false);
    if (!model.glbUrl) {
      setResolvedGlbUrl(null);
      return () => { active = false; };
    }
    void resolveProduct3DUrl(model.glbUrl)
      .then((url) => {
        if (active) setResolvedGlbUrl(url);
      })
      .catch(() => {
        if (!active) return;
        setResolverError(true);
        onModelReady?.();
      });
    return () => { active = false; };
  }, [model.glbUrl, onModelReady]);

  if (resolverError) {
    return (
      <div className="grid h-full w-full place-items-center px-6 text-center" role="alert">
        <div>
          <p className="text-sm font-bold text-ink">Model 3D belum dapat dimuat</p>
          <p className="mt-1 text-xs text-ink-muted">Muat ulang halaman atau coba beberapa saat lagi.</p>
        </div>
      </div>
    );
  }

  return (
    <Canvas
      // Respect display density up to 1.5x and smooth silhouette edges.
      // Keep shadows off and avoid DPR 2, which previously exhausted WebGL memory.
      shadows={false}
      camera={{ position: view.position, fov: 38 }}
      dpr={[1, 1.5]}
      performance={{ min: 0.5 }}
      gl={{ preserveDrawingBuffer: false, antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl, scene, camera }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        // Penyesuaian per produk (Admin → Model 3D) agar warna render
        // mendekati foto produk; default sama dengan pipeline sebelumnya.
        gl.toneMappingExposure = model.adjustment?.exposure ?? 1.15;
        onCanvasReady?.({ domElement: gl.domElement, captureFrame: () => {
          gl.render(scene, camera);
          return gl.domElement.toDataURL("image/png");
        } });
      }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      <CameraRig
        activeCamera={activeCamera}
        controlsRef={controlsRef}
        zoomUntil={zoomUntil}
      />
      <ExposureSync exposure={model.adjustment?.exposure ?? 1.15} />
      <TemporaryZoomReset zoomUntil={zoomUntil} />
      {/* Lighting */}
      <ambientLight intensity={lighting.ambient} />
      <hemisphereLight args={["#ffffff", "#cbd5e1", lighting.hemisphere]} />
      <directionalLight
        position={[3, 5, 4]}
        intensity={lighting.key}
      />
      <directionalLight position={[-4, 2, -3]} intensity={lighting.fill} color="#dbeafe" />

      <Suspense fallback={null}>
        {/* Real GLB path (Phase 8+) — guarded by glbUrl */}
        {resolvedGlbUrl ? (
          <GLBModel
            referenceLengthCm={model.referenceLengthCm}
            orientationY={model.orientationY}
            onScaleReady={onScaleReady}
            url={resolvedGlbUrl}
            fabricColor={fabricColor ?? fabricColorForName(color)}
            placements={placements}
            highlightZone={highlightZone}
            adjustment={model.adjustment}
            onModelReady={onModelReady}
            onThumbnailsReady={onThumbnailsReady}
            onSurfaceClick={onSurfaceClick}
          />
        ) : !model.glbUrl ? (
          <ProceduralShirt
            color={color}
            placements={placements}
            highlightZone={highlightZone}
          />
        ) : null}

      </Suspense>


      <OrbitControls
        ref={controlsRef}
        target={[0, 0, 0]}
        minDistance={0.82}
        maxDistance={6}
        zoomSpeed={1.7}
        enablePan={false}
        makeDefault
      />
    </Canvas>
  );
}

/** Sinkronkan tone-mapping exposure saat adjustment berubah (slider admin). */
function ExposureSync({ exposure }: { exposure: number }) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    gl.toneMappingExposure = exposure;
  }, [gl, exposure]);
  return null;
}

/**
 * CameraRig — orbit camera smoothly to the active preset position.
 * Keeps constant distance from center so camera ROTATES around the model,
 * never flies through it.
 */
function TemporaryZoomReset({ zoomUntil }: { zoomUntil: React.MutableRefObject<number> }) {
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    const markZooming = () => {
      // A short pause after the final wheel tick lets customers inspect a
      // detail, then the rig smoothly returns to the selected view distance.
      zoomUntil.current = performance.now() + 700;
    };
    gl.domElement.addEventListener("wheel", markZooming, { passive: true });
    return () => gl.domElement.removeEventListener("wheel", markZooming);
  }, [gl, zoomUntil]);

  return null;
}

function CameraRig({
  activeCamera,
  controlsRef,
  zoomUntil,
}: {
  activeCamera: CameraPreset;
  controlsRef: React.MutableRefObject<any>;
  zoomUntil: React.MutableRefObject<number>;
}) {
  const camera = useThree((state) => state.camera);
  const targetView = CAMERA_PRESET_VIEWS[activeCamera] ?? CAMERA_PRESET_VIEWS.front!;
  const desiredPos = useRef(new THREE.Vector3(...targetView.position));
  const desiredTarget = useRef(new THREE.Vector3(...targetView.target));

  useEffect(() => {
    const v = CAMERA_PRESET_VIEWS[activeCamera] ?? CAMERA_PRESET_VIEWS.front!;
    desiredPos.current.set(...v.position);
    desiredTarget.current.set(...v.target);

    // A preset is an explicit view selection, so it must never stop halfway
    // between two sides. The frame loop still keeps zoom recovery smooth.
    camera.position.set(...v.position);
    camera.lookAt(...v.target);
    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(...v.target);
      controls.update();
    }
  }, [activeCamera, camera, controlsRef]);

  useFrame(({ camera }) => {
    // Lerp target FIRST (snap to center quickly)
    const controls = controlsRef.current;
    const ctrlsTarget = controls?.target ?? new THREE.Vector3();

    // Get current direction from target to camera (normalized)
    const currentDir = new THREE.Vector3().subVectors(camera.position, ctrlsTarget);
    const currentDist = currentDir.length();
    currentDir.normalize();

    // Get desired direction from desired target to desired position
    const desiredDir = new THREE.Vector3().subVectors(desiredPos.current, desiredTarget.current);
    const desiredDist = desiredDir.length();
    desiredDir.normalize();

    // Rotate the direction on a sphere instead of linearly blending vectors.
    // A linear blend collapses to a near-zero vector when moving from front
    // (+Z) to back (-Z), briefly placing the camera inside the model.
    const rotation = new THREE.Quaternion().setFromUnitVectors(currentDir, desiredDir);
    const orbitStep = new THREE.Quaternion().identity().slerp(rotation, 0.06);
    const orbitDir = currentDir.clone().applyQuaternion(orbitStep).normalize();
    // OrbitControls may zoom freely while the wheel is moving. Once wheel
    // input stops, softly return only the distance to the preset; orientation
    // remains exactly where the customer left it.
    const shouldReturnToDefaultDistance = performance.now() > zoomUntil.current;
    const dist = shouldReturnToDefaultDistance
      ? THREE.MathUtils.lerp(currentDist, desiredDist, 0.07)
      : currentDist;

    // New camera position = target + slerpedDir * dist
    const newPos = desiredTarget.current.clone().add(orbitDir.multiplyScalar(dist));
    camera.position.copy(newPos);

    // Update controls target (lerp gently)
    if (controls) {
      controls.target.lerp(desiredTarget.current, 0.1);
      controls.update();
    } else {
      camera.lookAt(desiredTarget.current);
    }
  });

  return null;
}

// GLB loader — auto-centers + scales + supports raycast click for logo.

interface GLBModelProps {
  fabricColor: string;
  referenceLengthCm?: number;
  orientationY?: number;
  onScaleReady?: (unitsPerCm: number) => void;
  url: string;
  placements?: LogoPlacement[];
  highlightZone?: string | null;
  adjustment?: ModelColorAdjustment;
  onModelReady?: () => void;
  onThumbnailsReady?: (thumbnails: Partial<Record<CameraPreset, string>>) => void;
  onSurfaceClick?: (hit: { point: [number, number, number]; normal: [number, number, number] }) => void;
}

function GLBModel({ url, fabricColor, placements = [], highlightZone, adjustment, onModelReady, onSurfaceClick, onThumbnailsReady, referenceLengthCm, orientationY, onScaleReady }: GLBModelProps) {
  // Keep Draco decoding same-origin. Production CSP intentionally does not
  // allow third-party decoder scripts from the default Google CDN.
  const { scene } = useGLTF(url, "/draco/", true, configureStudioGLTFLoader);
  const [, forceTick] = useState(0);
  const renderer = useThree((state) => state.gl);

  // Clone + auto-fit SYNCHRONOUSLY so transform applied before first render.
  const fitted = useMemo(() => {
    const cloned = fitGarmentModel(scene, orientationY);

    cloned.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const sourceMaterials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      const clonedMaterials = sourceMaterials.map((source) =>
        prepareGarmentMaterial(source, DEFAULT_MODEL_COLOR_ADJUSTMENT),
      );
      child.material = Array.isArray(child.material)
        ? clonedMaterials
        : clonedMaterials[0]!;
    });
    return cloned;
  }, [scene, orientationY]);

  const normalizedAdjustment = useMemo(
    () => normalizeModelColorAdjustment(adjustment),
    [adjustment],
  );
  useLayoutEffect(() => {
    updateGarmentColorCalibration(fitted, normalizedAdjustment);
    updateFabricColor(fitted, fabricColor);
  }, [fitted, normalizedAdjustment, fabricColor]);

  useEffect(() => () => {
    fitted.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => material.dispose());
    });
  }, [fitted]);

  const unitsPerCm = useMemo(() => modelUnitsPerCm(
    new THREE.Box3().setFromObject(fitted).getSize(new THREE.Vector3()).y,
    referenceLengthCm,
  ), [fitted, referenceLengthCm]);

  useEffect(() => { onScaleReady?.(unitsPerCm); }, [onScaleReady, unitsPerCm]);

  useEffect(() => {
    onModelReady?.();
  }, [fitted, onModelReady]);

  useEffect(() => {
    if (!onThumbnailsReady) return;
    const frame = requestAnimationFrame(() => {
      try { onThumbnailsReady(renderModelThumbnails(renderer, fitted, fabricColor)); }
      catch (error) {
        console.warn("[Studio Bordir] Camera thumbnails could not be rendered:", error);
        onThumbnailsReady({});
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [renderer, fitted, onThumbnailsReady, fabricColor, normalizedAdjustment]);

  // Raycast click → get surface point + normal
  const handleClick = (e: any) => {
    if (!onSurfaceClick) return;
    e.stopPropagation();
    const point: [number, number, number] = [e.point.x, e.point.y, e.point.z];
    const n = e.face?.normal;
    const normal: [number, number, number] = n
      ? [n.x, n.y, n.z]
      : [0, 0, 1];
    onSurfaceClick({ point, normal });
  };

  return (
    <group>
      <primitive object={fitted} />

      {/* Debug zone markers — show ALL zones as colored dots so customer
          can see where each zone is without uploading logo first. */}
      {(Object.keys(ZONE_ANCHORS) as EmbroideryZone[]).map((zone) => {
        const anchor = ZONE_ANCHORS[zone];
        const hasPlacement = placements.some((p) => p.zone === zone);
        const isHi = highlightZone === zone;
        // Keep the selected zone marker visible even after upload, so the
        // customer can verify the embroidery reference point.
        if (hasPlacement && !isHi) return null;
        return (
          <ZoneMarker
            key={`marker-${zone}`}
            modelRoot={fitted}
            zone={zone}
            highlighted={isHi}
          />
        );
      })}

      {/* Logo placements — auto-placed at ZONE_ANCHORS, raycast for fine-tune */}
      {placements.map((placement) => (
        <EmbroideryDecal
          unitsPerCm={unitsPerCm}
          key={placement.zone}
          modelRoot={fitted}
          placement={placement}
          highlighted={highlightZone === placement.zone}
          onTextureLoaded={() => forceTick((n: number) => n + 1)}
        />
      ))}

      {false && placements.map((p) => {
        const isHi = highlightZone === p.zone;
        const anchor = ZONE_ANCHORS[p.zone];

        const isBackZone = p.zone === "upper_back" || p.zone === "middle_back";
        const isLeftSleeve = p.zone === "left_sleeve";
        const isRightSleeve = p.zone === "right_sleeve";
        const pos: [number, number, number] = [
          p.surfacePoint?.[0] ?? anchor.x,
          p.surfacePoint?.[1] ?? anchor.y,
          p.surfacePoint?.[2] ?? anchor.z,
        ];

        // Plane orientation per zona — rotasi Y supaya plane menghadap KELUAR dari kemeja.
        // Three.js rotasi Y: rotY=PI/2 → face +X, rotY=-PI/2 → face -X
        let rotY: number;
        let flipX = false;
        if (isBackZone) { rotY = Math.PI; flipX = true; }           // face -Z, flip karena 180°
        else if (isLeftSleeve) { rotY = Math.PI / 2; flipX = false; }  // face +X (lengan kiri di X+)
        else if (isRightSleeve) { rotY = -Math.PI / 2; flipX = false; } // face -X (lengan kanan di X-)
        else { rotY = 0; flipX = false; }                             // face +Z (dada)

        // Hitung dimensi plane dari aspect ratio texture asli (jangan stretch)
        const tex = p.logoPreviewUrl ? logoTexture(p.logoPreviewUrl, () => forceTick((n: number) => n + 1)) : null;
        const { width: imgW, height: imgH } = textureImageDimensions(tex);
        const logoAspect = imgW > 0 && imgH > 0 ? imgW / imgH : p.widthCm / p.heightCm;
        const baseW = p.widthCm * unitsPerCm;
        const w = baseW;
        const h = baseW / logoAspect;

        return (
          <mesh
            key={p.zone}
            position={pos}
            rotation={[0, rotY, (p.rotation * Math.PI) / 180]}
            scale={[flipX ? -1 : 1, 1, 1]}
          >
            <planeGeometry args={[w, h]} />
            {tex ? (
              <meshBasicMaterial
                map={tex}
                side={THREE.DoubleSide}
                transparent
                toneMapped={false}
              />
            ) : (
              <meshStandardMaterial
                color="#ffffff"
                emissive={isHi ? "#dc9814" : "#f59e0b"}
                emissiveIntensity={isHi ? 0.5 : 0.3}
                roughness={0.5}
                side={THREE.DoubleSide}
                transparent
                opacity={0.95}
              />
            )}
          </mesh>
        );
      })}
    </group>
  );
}

type ColorGradeShader = {
  uniforms: Record<string, { value: number }>;
  fragmentShader: string;
};

const COLOR_GRADE_CHUNK = `
uniform float ofissioBrightness;
uniform float ofissioSaturation;
uniform float ofissioHue;
uniform float ofissioTemperature;

vec3 ofissioGradeColor(vec3 sourceColor) {
  float luminance = dot(sourceColor, vec3(0.2126, 0.7152, 0.0722));
  vec3 saturated = mix(vec3(luminance), sourceColor, ofissioSaturation);

  float yiqY = dot(saturated, vec3(0.299, 0.587, 0.114));
  float yiqI = dot(saturated, vec3(0.596, -0.275, -0.321));
  float yiqQ = dot(saturated, vec3(0.212, -0.523, 0.311));
  float chroma = sqrt(yiqI * yiqI + yiqQ * yiqQ);
  float hueAngle = atan(yiqQ, yiqI) + ofissioHue;
  float rotatedI = chroma * cos(hueAngle);
  float rotatedQ = chroma * sin(hueAngle);
  vec3 rotated = vec3(
    yiqY + 0.956 * rotatedI + 0.621 * rotatedQ,
    yiqY - 0.272 * rotatedI - 0.647 * rotatedQ,
    yiqY - 1.106 * rotatedI + 1.703 * rotatedQ
  );

  vec3 temperatureScale = vec3(
    1.0 + 0.12 * ofissioTemperature,
    1.0,
    1.0 - 0.12 * ofissioTemperature
  );
  return max(rotated * temperatureScale * ofissioBrightness, vec3(0.0));
}
`;

function prepareGarmentMaterial(
  source: THREE.Material,
  adjustment: ModelColorAdjustment,
): THREE.Material {
  const cloned = source.clone();
  if (!(cloned instanceof THREE.MeshStandardMaterial)) return cloned;

  cloned.metalness = 0;
  cloned.roughness = 0.78;
  cloned.envMapIntensity = 0.25;
  cloned.dithering = true;
  if (cloned.map) {
    // Kept as a controllable fill for legacy/dark GLBs. The color-grade
    // shader below now adjusts this path too, so emissive no longer locks the
    // fabric into its original hue or saturation.
    cloned.emissiveMap = cloned.map;
    cloned.emissive.set("#ffffff");
  }
  cloned.emissiveIntensity = adjustment.emissiveIntensity;
  cloned.userData.ofissioColorAdjustment = { ...adjustment };
  const fabricMasked = hasFabricMask(cloned) && cloned.vertexColors && !!cloned.map && !cloned.transparent;
  if (fabricMasked) {
    // Generated metallic/roughness maps can make cotton look like polished
    // leather. Prepared fabric uses a stable matte finish in every color.
    cloned.roughnessMap = null;
    cloned.metalnessMap = null;
    cloned.roughness = 0.92;
  }

  const originalOnBeforeCompile = cloned.onBeforeCompile.bind(cloned);
  const originalProgramCacheKey = cloned.customProgramCacheKey.bind(cloned);
  cloned.onBeforeCompile = (shader, renderer) => {
    originalOnBeforeCompile(shader, renderer);
    const currentAdjustment = normalizeModelColorAdjustment(
      cloned.userData.ofissioColorAdjustment as Partial<ModelColorAdjustment> | undefined,
    );
    shader.uniforms.ofissioBrightness = { value: currentAdjustment.brightness };
    shader.uniforms.ofissioSaturation = { value: currentAdjustment.saturation };
    shader.uniforms.ofissioHue = { value: THREE.MathUtils.degToRad(currentAdjustment.hue) };
    shader.uniforms.ofissioTemperature = { value: currentAdjustment.temperature };
    if (fabricMasked) {
      shader.uniforms.ofissioFabricColor = { value: cloned.userData.ofissioFabricColor ?? new THREE.Color("#ffffff") };
    }
    shader.fragmentShader = shader.fragmentShader
      .replace("void main() {", `${COLOR_GRADE_CHUNK}\n${fabricMasked ? FABRIC_RECOLOR_GLSL : ""}\nvoid main() {`)
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>\ndiffuseColor.rgb = ofissioGradeColor(${fabricMasked ? "ofissioRecolorFabric(diffuseColor.rgb)" : "diffuseColor.rgb"});`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>\ntotalEmissiveRadiance = ofissioGradeColor(${fabricMasked ? "ofissioRecolorFabric(totalEmissiveRadiance)" : "totalEmissiveRadiance"});`,
      );
    cloned.userData.ofissioColorGradeShader = shader;
  };
  cloned.customProgramCacheKey = () => `${originalProgramCacheKey()}|ofissio-color-grade-v2|fabric:${fabricMasked}`;
  cloned.needsUpdate = true;
  return cloned;
}

function updateGarmentColorCalibration(
  root: THREE.Object3D,
  adjustment: ModelColorAdjustment,
) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (!(material instanceof THREE.MeshStandardMaterial)) return;
      material.emissiveIntensity = adjustment.emissiveIntensity;
      material.userData.ofissioColorAdjustment = { ...adjustment };
      const shader = material.userData.ofissioColorGradeShader as ColorGradeShader | undefined;
      if (!shader) return;
      shader.uniforms.ofissioBrightness!.value = adjustment.brightness;
      shader.uniforms.ofissioSaturation!.value = adjustment.saturation;
      shader.uniforms.ofissioHue!.value = THREE.MathUtils.degToRad(adjustment.hue);
      shader.uniforms.ofissioTemperature!.value = adjustment.temperature;
    });
  });
}

function projectZoneAnchor(modelRoot: THREE.Object3D, zone: EmbroideryZone, point?: [number, number, number]) {
  const initial = ZONE_ANCHORS[zone];
  const anchor = point ? { x: point[0], y: point[1], z: point[2] } : initial;
  let origin: THREE.Vector3;
  let direction: THREE.Vector3;

  if (zone === "upper_back" || zone === "middle_back") {
    origin = new THREE.Vector3(anchor.x, anchor.y, -2);
    direction = new THREE.Vector3(0, 0, 1);
  } else if (zone === "left_sleeve") {
    origin = new THREE.Vector3(2, anchor.y, anchor.z);
    direction = new THREE.Vector3(-1, 0, 0);
  } else if (zone === "right_sleeve") {
    origin = new THREE.Vector3(-2, anchor.y, anchor.z);
    direction = new THREE.Vector3(1, 0, 0);
  } else {
    origin = new THREE.Vector3(anchor.x, anchor.y, 2);
    direction = new THREE.Vector3(0, 0, -1);
  }

  modelRoot.updateMatrixWorld(true);
  const hit = new THREE.Raycaster(origin, direction).intersectObject(modelRoot, true)[0];
  if (!hit) {
    return {
      position: new THREE.Vector3(anchor.x, anchor.y, anchor.z),
      normal: direction.negate(),
      mesh: null,
    };
  }

  const normal = hit.face?.normal
    ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize()
    : direction.clone().negate();
  return {
    position: hit.point,
    normal,
    mesh: hit.object instanceof THREE.Mesh ? hit.object : null,
  };
}

function ZoneMarker({
  modelRoot,
  zone,
  highlighted,
}: {
  modelRoot: THREE.Object3D;
  zone: EmbroideryZone;
  highlighted: boolean;
}) {
  const projected = useMemo(() => projectZoneAnchor(modelRoot, zone), [modelRoot, zone]);
  const position = projected.position.clone().addScaledVector(projected.normal, 0.004);
  const orientation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), projected.normal);

  return (
    <mesh position={position} quaternion={orientation} renderOrder={3}>
      <circleGeometry args={[0.04, 16]} />
      <meshBasicMaterial
        color={highlighted ? "#dc9814" : "#4a6bd8"}
        side={THREE.DoubleSide}
        transparent
        opacity={0}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
      />
    </mesh>
  );
}

interface EmbroideryDecalProps {
  unitsPerCm: number;
  modelRoot: THREE.Object3D;
  placement: LogoPlacement;
  highlighted: boolean;
  onTextureLoaded: () => void;
}

/** Projects the logo onto the cloth mesh, preserving the fabric contour. */
function EmbroideryDecal({
  unitsPerCm,
  modelRoot,
  placement,
  highlighted,
  onTextureLoaded,
}: EmbroideryDecalProps) {
  // Re-project after every position adjustment. A saved anchor depth belongs
  // to the old garment, not necessarily the surface of a replacement GLB.
  // Keeping that depth made moved logos disappear into KL-007's back panel.
  const projectedAnchor = useMemo(
    () => projectZoneAnchor(modelRoot, placement.zone, placement.surfacePoint),
    [modelRoot, placement.zone, placement.surfacePoint],
  );
  const position = projectedAnchor.position;
  const orientation = useMemo(() => {
    const rotation = (placement.rotation * Math.PI) / 180;
    if (placement.zone === "upper_back" || placement.zone === "middle_back") {
      return new THREE.Euler(0, Math.PI, -rotation);
    }
    if (placement.zone === "left_sleeve") return new THREE.Euler(0, Math.PI / 2, rotation);
    if (placement.zone === "right_sleeve") return new THREE.Euler(0, -Math.PI / 2, rotation);
    return new THREE.Euler(0, 0, rotation);
  }, [placement.rotation, placement.zone]);

  const textPreview = useMemo(() => placement.textBordir && !placement.logoPreviewUrl ? renderNamePreview(placement.textBordir) : null, [placement.textBordir, placement.logoPreviewUrl]);
  const textureUrl = placement.logoPreviewUrl || textPreview;
  const texture = textureUrl
    ? logoTexture(textureUrl, onTextureLoaded)
    : null;
  const imageSize = textureImageDimensions(texture);
  const aspect = imageSize.width > 0 && imageSize.height > 0
    ? imageSize.width / imageSize.height
    : placement.widthCm / placement.heightCm;
  const width = placement.widthCm * unitsPerCm;
  const height = width / aspect;

  const geometries = useMemo(() => {
    modelRoot.updateMatrixWorld(true);
    const decals: THREE.BufferGeometry[] = [];
    // The shirt curves away from the centre of a chest/back logo. A shallow
    // projector clips those outer pixels, so give the decal enough depth to
    // cover the complete artwork while it follows the cloth contour.
    const size = new THREE.Vector3(width, height, 0.16);
    const createDecal = (mesh: THREE.Mesh) => {
      const decal = new DecalGeometry(mesh, position, orientation, size);
      if (decal.getAttribute("position")?.count > 0) decals.push(decal);
      else decal.dispose();
    };

    // A single raycast identifies the garment surface. Projecting onto every
    // GLB mesh was expensive and delayed the first visible logo after upload.
    if (projectedAnchor.mesh) {
      createDecal(projectedAnchor.mesh);
    } else {
      modelRoot.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) createDecal(child);
      });
    }
    return decals;
  }, [height, modelRoot, orientation, position, projectedAnchor.mesh, width]);

  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries]);

  // Some imported GLB meshes do not expose triangles in the decal projector's
  // volume. Keep the logo usable in that case with a near-zero surface offset.
  const fallbackNormal = useMemo(() => {
    if (placement.zone === "upper_back" || placement.zone === "middle_back") {
      return new THREE.Vector3(0, 0, -1);
    }
    if (placement.zone === "left_sleeve") return new THREE.Vector3(1, 0, 0);
    if (placement.zone === "right_sleeve") return new THREE.Vector3(-1, 0, 0);
    return new THREE.Vector3(0, 0, 1);
  }, [placement.zone]);
  const fallbackPosition = position.clone().addScaledVector(fallbackNormal, 0.004);

  const material = texture ? (
    <meshBasicMaterial
      map={texture}
      transparent
      alphaTest={0.5}
      depthWrite={false}
      side={THREE.DoubleSide}
      toneMapped={false}
      polygonOffset
      polygonOffsetFactor={-2}
      polygonOffsetUnits={-2}
    />
  ) : (
    <meshStandardMaterial
      color={highlighted ? "#dc9814" : "#f59e0b"}
      emissive={highlighted ? "#dc9814" : "#f59e0b"}
      emissiveIntensity={0.22}
      roughness={0.72}
      polygonOffset
      polygonOffsetFactor={-2}
      polygonOffsetUnits={-2}
    />
  );

  if (geometries.length === 0) {
    return (
      <mesh position={fallbackPosition} rotation={orientation} renderOrder={2}>
        <planeGeometry args={[width, height]} />
        {material}
      </mesh>
    );
  }

  return geometries.map((geometry, index) => (
    <mesh key={index} geometry={geometry} renderOrder={2}>
      {material}
    </mesh>
  ));
}

// Cache textures + force re-render when loaded.
const _texCache = new Map<string, THREE.Texture>();
const _loadedUrls = new Set<string>();

function textureImageDimensions(texture: THREE.Texture | null | undefined) {
  const image = texture?.image as
    | { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number }
    | undefined;
  return {
    width: image?.naturalWidth ?? image?.width ?? 0,
    height: image?.naturalHeight ?? image?.height ?? 0,
  };
}

function logoTexture(url: string, onLoaded?: () => void): THREE.Texture {
  let tex = _texCache.get(url);
  if (!tex) {
    tex = new THREE.TextureLoader().load(url, () => {
      const image = tex!.image as HTMLImageElement;
      // Retain the exact artwork and stroke width, but strengthen its alpha.
      // Uploaded PNG text is often semi-transparent and otherwise fades into
      // the light fabric when composited in WebGL.
      _texCache.set(url, createSolidEmbroideryTexture(image));
      _loadedUrls.add(url);
      onLoaded?.();
    });
    _texCache.set(url, tex);
  } else if (_loadedUrls.has(url)) {
    tex.needsUpdate = true;
  }
  return tex;
}

/** Makes translucent ink more solid without widening or recolouring artwork. */
function createSolidEmbroideryTexture(image: HTMLImageElement): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.Texture(image);

  context.drawImage(image, 0, 0);
  const source = context.getImageData(0, 0, canvas.width, canvas.height);
  const output = new Uint8ClampedArray(source.data);
  for (let offset = 0; offset < output.length; offset += 4) {
    const alpha = output[offset + 3]!;
    if (alpha === 0) continue;
    // Gamma lift: 50% alpha becomes 71%, retaining antialiasing at the edge.
    output[offset + 3] = Math.round(255 * Math.sqrt(alpha / 255));
  }

  context.putImageData(new ImageData(output, canvas.width, canvas.height), 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
import { renderNamePreview } from "@/lib/embroidery-names";
