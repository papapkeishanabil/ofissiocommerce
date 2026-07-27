// src/components/configurator/Uniform3DViewer.tsx
// The actual R3F canvas. Lazy-loaded by the configurator (see
// Uniform3DConfigurator) so the three.js bundle never ships to product
// detail pages that don't open the 3D tab.

"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import type {
  CameraPreset,
  EmbroideryZone,
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
      <primitive object={fitted} />

      {/* Debug zone markers — show ALL zones as colored dots so customer
          can see where each zone is without uploading logo first. */}
      {(Object.keys(ZONE_ANCHORS) as EmbroideryZone[]).map((zone) => {
        const anchor = ZONE_ANCHORS[zone];
        const isBackZone = zone === "upper_back" || zone === "middle_back";
        const isLeftSleeve = zone === "left_sleeve";
        const isRightSleeve = zone === "right_sleeve";
        const hasPlacement = placements.some((p) => p.zone === zone);
        const isHi = highlightZone === zone;
        if (hasPlacement) return null;
        let markerRotY: number;
        if (isBackZone) markerRotY = Math.PI;
        else if (isLeftSleeve) markerRotY = -Math.PI / 2;
        else if (isRightSleeve) markerRotY = Math.PI / 2;
        else markerRotY = 0;
        return (
          <mesh
            key={`marker-${zone}`}
            position={[anchor.x, anchor.y, anchor.z]}
            rotation={[0, markerRotY, 0]}
          >
            <circleGeometry args={[0.04, 16]} />
            <meshBasicMaterial
              color={isHi ? "#dc9814" : "#4a6bd8"}
              side={THREE.DoubleSide}
              transparent
              opacity={0.8}
            />
          </mesh>
        );
      })}

      {/* Logo placements — auto-placed at ZONE_ANCHORS, raycast for fine-tune */}
      {placements.map((p) => {
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

        // Plane orientation per zona
        let rotY: number;
        let flipX = false; // flip texture supaya tidak mirror
        if (isBackZone) { rotY = Math.PI; flipX = true; }
        else if (isLeftSleeve) { rotY = -Math.PI / 2; flipX = true; }
        else if (isRightSleeve) { rotY = Math.PI / 2; flipX = false; }
        else { rotY = 0; flipX = false; }

        // Hitung dimensi plane dari aspect ratio texture asli (jangan stretch)
        const tex = p.logoPreviewUrl ? logoTexture(p.logoPreviewUrl, () => forceTick((n: number) => n + 1)) : null;
        const imgEl = tex?.image as HTMLImageElement | undefined;
        const imgW = imgEl?.naturalWidth ?? 0;
        const imgH = imgEl?.naturalHeight ?? 0;
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

// Cache textures + force re-render when loaded.
const _texCache = new Map<string, THREE.Texture>();
const _loadedUrls = new Set<string>();
function logoTexture(url: string, onLoaded?: () => void): THREE.Texture {
  let tex = _texCache.get(url);
  if (!tex) {
    tex = new THREE.TextureLoader().load(url, () => {
      tex!.colorSpace = THREE.SRGBColorSpace;
      tex!.needsUpdate = true;
      _loadedUrls.add(url);
      onLoaded?.();
    });
    _texCache.set(url, tex);
  } else if (_loadedUrls.has(url)) {
    tex.needsUpdate = true;
  }
  return tex;
}
