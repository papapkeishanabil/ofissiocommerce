// src/components/configurator/Uniform3DViewer.tsx
// The actual R3F canvas. Lazy-loaded by the configurator (see
// Uniform3DConfigurator) so the three.js bundle never ships to product
// detail pages that don't open the 3D tab.

"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import type {
  CameraPreset,
  LogoPlacement,
} from "@/types/uniform-3d";
import { CAMERA_PRESET_VIEWS, ZONE_ANCHORS, type Model3DEntry } from "@/data/uniform-3d";
import { ProceduralShirt } from "./ProceduralShirt";

interface Uniform3DViewerProps {
  model: Model3DEntry;
  color: string;
  placements: LogoPlacement[];
  activeCamera: CameraPreset;
  highlightZone?: string | null;
  onCanvasReady?: (gl: { domElement: HTMLCanvasElement }) => void;
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
  onSurfaceClick,
}: Uniform3DViewerProps) {
  const view = CAMERA_PRESET_VIEWS[activeCamera] ?? CAMERA_PRESET_VIEWS.front!;
  const isGLB = !!model.glbUrl;

  return (
    <Canvas
      shadows
      camera={{ position: view.position, fov: 38 }}
      dpr={[1, 2]}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      onCreated={({ gl }) => onCanvasReady?.({ domElement: gl.domElement })}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[3, 5, 4]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-4, 2, -3]} intensity={0.35} color="#a8baff" />

      <Suspense fallback={null}>
        {/* Real GLB path (Phase 8+) — guarded by glbUrl */}
        {model.glbUrl ? (
          <GLBModel
            url={model.glbUrl}
            placements={placements}
            highlightZone={highlightZone}
            onSurfaceClick={onSurfaceClick}
          />
        ) : (
          <ProceduralShirt
            color={color}
            placements={placements}
            highlightZone={highlightZone}
          />
        )}

        <Environment preset="studio" />
      </Suspense>

      <ContactShadows
        position={[0, -1.05, 0]}
        opacity={0.35}
        scale={6}
        blur={2.4}
        far={3}
        color="#0b1a4d"
      />

      <OrbitControls
        target={[0, 0, 0]}
        minDistance={1.0}
        maxDistance={6}
        enablePan={false}
        makeDefault
      />
    </Canvas>
  );
}

// GLB loader — auto-centers + scales + supports raycast click for logo.

interface GLBModelProps {
  url: string;
  placements?: LogoPlacement[];
  highlightZone?: string | null;
  onSurfaceClick?: (hit: { point: [number, number, number]; normal: [number, number, number] }) => void;
}

function GLBModel({ url, placements = [], highlightZone, onSurfaceClick }: GLBModelProps) {
  const { scene } = useGLTF(url);

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
          mat.roughness = 0.92;
          mat.envMapIntensity = 0.4;
        }
      }
    });
    return cloned;
  }, [scene]);

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
      <primitive object={fitted} onPointerDown={handleClick} />

      {/* Logo placements — auto-placed at ZONE_ANCHORS, raycast for fine-tune */}
      {placements.map((p) => {
        const w = (p.widthCm / 30) * 0.9;
        const h = (p.heightCm / 30) * 0.9;
        const isHi = highlightZone === p.zone;
        const anchor = ZONE_ANCHORS[p.zone];

        // If customer clicked on surface (raycast), use that exact point.
        // Otherwise, use the default zone anchor position.
        const pos = p.surfacePoint ?? [anchor.x, anchor.y, anchor.z + 0.02];
        const norm = p.surfaceNormal ?? [0, 0, 1];

        // Orient plane to face along the surface normal
        const lookAt = new THREE.Vector3(pos[0] + norm[0], pos[1] + norm[1], pos[2] + norm[2]);
        const dummy = new THREE.Object3D();
        dummy.position.set(pos[0], pos[1], pos[2]);
        dummy.lookAt(lookAt);
        dummy.rotateZ((p.rotation * Math.PI) / 180);

        return (
          <mesh
            key={p.zone}
            position={pos as [number, number, number]}
            quaternion={dummy.quaternion}
          >
            <planeGeometry args={[w, h]} />
            {p.logoPreviewUrl ? (
              <meshBasicMaterial
                map={logoTexture(p.logoPreviewUrl)}
                transparent
                side={THREE.DoubleSide}
              />
            ) : (
              <meshStandardMaterial
                color="#f8fafc"
                emissive="#dc9814"
                emissiveIntensity={isHi ? 0.35 : 0.12}
                roughness={0.6}
                side={THREE.DoubleSide}
                transparent
                opacity={0.92}
              />
            )}
          </mesh>
        );
      })}
    </group>
  );
}

// Cache textures so we don't re-create on every render frame.
const _texCache = new Map<string, THREE.Texture>();
function logoTexture(url: string): THREE.Texture {
  let tex = _texCache.get(url);
  if (!tex) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    tex = new THREE.Texture(img);
    tex.colorSpace = THREE.SRGBColorSpace;
    img.onload = () => {
      tex!.needsUpdate = true;
    };
    _texCache.set(url, tex);
  }
  return tex;
}
