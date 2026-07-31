// src/components/configurator/Uniform3DViewer.tsx
// The actual R3F canvas. Lazy-loaded by the configurator (see
// Uniform3DConfigurator) so the three.js bundle never ships to product
// detail pages that don't open the 3D tab.

"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
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

interface Uniform3DViewerProps {
  model: Model3DEntry;
  color: string;
  placements: LogoPlacement[];
  activeCamera: CameraPreset;
  highlightZone?: string | null;
  onCanvasReady?: (gl: { domElement: HTMLCanvasElement }) => void;
  onModelReady?: () => void;
  /** Raycast: customer klik surface → dapat posisi + normal untuk logo */
  onSurfaceClick?: (hit: { point: [number, number, number]; normal: [number, number, number] }) => void;
}

export function Uniform3DViewer({
  model,
  color,
  placements,
  activeCamera,
  highlightZone,
  onCanvasReady,
  onModelReady,
  onSurfaceClick,
}: Uniform3DViewerProps) {
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
      // Keep the configurator below the browser's WebGL memory threshold.
      // The GLB and environment are already detailed; runtime shadows at DPR 2
      // caused context loss after the preview was opened repeatedly.
      shadows={false}
      camera={{ position: view.position, fov: 38 }}
      dpr={[1, 1]}
      performance={{ min: 0.5 }}
      gl={{ preserveDrawingBuffer: false, antialias: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
        onCanvasReady?.({ domElement: gl.domElement });
      }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      <CameraRig
        activeCamera={activeCamera}
        controlsRef={controlsRef}
        zoomUntil={zoomUntil}
      />
      <TemporaryZoomReset zoomUntil={zoomUntil} />
      {/* Lighting */}
      <ambientLight intensity={0.9} />
      <hemisphereLight args={["#ffffff", "#cbd5e1", 0.7]} />
      <directionalLight
        position={[3, 5, 4]}
        intensity={1.45}
      />
      <directionalLight position={[-4, 2, -3]} intensity={0.55} color="#dbeafe" />

      <Suspense fallback={null}>
        {/* Real GLB path (Phase 8+) — guarded by glbUrl */}
        {resolvedGlbUrl ? (
          <GLBModel
            url={resolvedGlbUrl}
            placements={placements}
            highlightZone={highlightZone}
            onModelReady={onModelReady}
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
  const targetView = CAMERA_PRESET_VIEWS[activeCamera] ?? CAMERA_PRESET_VIEWS.front!;
  const desiredPos = useRef(new THREE.Vector3(...targetView.position));
  const desiredTarget = useRef(new THREE.Vector3(...targetView.target));

  useEffect(() => {
    const v = CAMERA_PRESET_VIEWS[activeCamera] ?? CAMERA_PRESET_VIEWS.front!;
    desiredPos.current.set(...v.position);
    desiredTarget.current.set(...v.target);
  }, [activeCamera]);

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
  url: string;
  placements?: LogoPlacement[];
  highlightZone?: string | null;
  onModelReady?: () => void;
  onSurfaceClick?: (hit: { point: [number, number, number]; normal: [number, number, number] }) => void;
}

function GLBModel({ url, placements = [], highlightZone, onModelReady, onSurfaceClick }: GLBModelProps) {
  const { scene } = useGLTF(url);
  const [, forceTick] = useState(0);

  // Clone + auto-fit SYNCHRONOUSLY so transform applied before first render.
  const fitted = useMemo(() => {
    const cloned = scene.clone(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    const targetHeight = 1.76;
    const scale = targetHeight / maxDim;

    cloned.traverse((child) => {
      if (child.type === "Mesh") {
        const mesh = child as THREE.Mesh;
        mesh.scale.multiplyScalar(scale);
        mesh.position.sub(center.multiplyScalar(scale));
        const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat && mat.isMeshStandardMaterial) {
            mat.metalness = 0.0;
            mat.roughness = 0.78;
            mat.envMapIntensity = 0.25;
            // Tripo exports this garment with a highly metallic material.
            // In our lightweight (non-HDR) viewer, add a small texture-based
            // emissive contribution so dark navy remains navy, not black.
            if (mat.map) {
              mat.emissiveMap = mat.map;
              mat.emissive.set("#ffffff");
              mat.emissiveIntensity = 0.6;
            }
        }
      }
    });
    return cloned;
  }, [scene]);

  useEffect(() => {
    onModelReady?.();
  }, [fitted, onModelReady]);

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
        const baseW = (p.widthCm / 30) * 0.9;
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

function projectZoneAnchor(modelRoot: THREE.Object3D, zone: EmbroideryZone) {
  const anchor = ZONE_ANCHORS[zone];
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
  modelRoot: THREE.Object3D;
  placement: LogoPlacement;
  highlighted: boolean;
  onTextureLoaded: () => void;
}

/** Projects the logo onto the cloth mesh, preserving the fabric contour. */
function EmbroideryDecal({
  modelRoot,
  placement,
  highlighted,
  onTextureLoaded,
}: EmbroideryDecalProps) {
  const anchor = ZONE_ANCHORS[placement.zone];
  // Configurations saved before the anchor correction used z=±0.16, which is
  // inside this GLB. Treat that exact former default as an anchor, so existing
  // uploads move to the visible cloth surface without requiring re-upload.
  const isLegacyChestAnchor =
    (placement.zone === "left_chest" || placement.zone === "right_chest") &&
    placement.surfacePoint != null &&
    Math.abs(placement.surfacePoint[0] - anchor.x) < 0.001 &&
    Math.abs(placement.surfacePoint[1] - anchor.y) < 0.001 &&
    Math.abs(placement.surfacePoint[2] - 0.16) < 0.001;
  const isLegacyBackAnchor =
    (placement.zone === "upper_back" || placement.zone === "middle_back") &&
    placement.surfacePoint != null &&
    Math.abs(placement.surfacePoint[0] - anchor.x) < 0.001 &&
    Math.abs(placement.surfacePoint[1] - anchor.y) < 0.001 &&
    Math.abs(placement.surfacePoint[2] + 0.16) < 0.001;
  const isCurrentAnchor =
    placement.surfacePoint != null &&
    Math.abs(placement.surfacePoint[0] - anchor.x) < 0.001 &&
    Math.abs(placement.surfacePoint[1] - anchor.y) < 0.001 &&
    Math.abs(placement.surfacePoint[2] - anchor.z) < 0.001;
  const useAnchor = !placement.surfacePoint || isLegacyChestAnchor || isLegacyBackAnchor || isCurrentAnchor;
  const projectedAnchor = useMemo(
    () => projectZoneAnchor(modelRoot, placement.zone),
    [modelRoot, placement.zone],
  );
  const position = useMemo(
    () => useAnchor
      ? projectedAnchor.position
      : new THREE.Vector3(...placement.surfacePoint!),
    [placement.surfacePoint, projectedAnchor.position, useAnchor],
  );
  const orientation = useMemo(() => {
    const rotation = (placement.rotation * Math.PI) / 180;
    if (placement.zone === "upper_back" || placement.zone === "middle_back") {
      return new THREE.Euler(0, Math.PI, -rotation);
    }
    if (placement.zone === "left_sleeve") return new THREE.Euler(0, Math.PI / 2, rotation);
    if (placement.zone === "right_sleeve") return new THREE.Euler(0, -Math.PI / 2, rotation);
    return new THREE.Euler(0, 0, rotation);
  }, [placement.rotation, placement.zone]);

  const texture = placement.logoPreviewUrl
    ? logoTexture(placement.logoPreviewUrl, onTextureLoaded)
    : null;
  const imageSize = textureImageDimensions(texture);
  const aspect = imageSize.width > 0 && imageSize.height > 0
    ? imageSize.width / imageSize.height
    : placement.widthCm / placement.heightCm;
  const width = (placement.widthCm / 30) * 0.9;
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
