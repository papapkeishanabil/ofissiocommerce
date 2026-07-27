// src/components/configurator/Uniform3DViewer.tsx
// The actual R3F canvas. Lazy-loaded by the configurator (see
// Uniform3DConfigurator) so the three.js bundle never ships to product
// detail pages that don't open the 3D tab.

"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";

import type {
  CameraPreset,
  LogoPlacement,
} from "@/types/uniform-3d";
import { CAMERA_PRESET_VIEWS, type Model3DEntry } from "@/data/uniform-3d";
import { ProceduralShirt } from "./ProceduralShirt";

interface Uniform3DViewerProps {
  model: Model3DEntry;
  color: string;
  placements: LogoPlacement[];
  activeCamera: CameraPreset;
  highlightZone?: string | null;
  onCanvasReady?: (gl: { domElement: HTMLCanvasElement }) => void;
}

export function Uniform3DViewer({
  model,
  color,
  placements,
  activeCamera,
  highlightZone,
  onCanvasReady,
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
          <GLBModel url={model.glbUrl} />
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
        target={[0, -0.15, 0]}
        minDistance={1.2}
        maxDistance={6}
        enablePan={false}
        // Allow free rotate/zoom between presets; preset change animates via key.
        makeDefault
      />
    </Canvas>
  );
}

// GLB loader — only used when model.glbUrl is set. Auto-centers + scales
// the model to fit the viewer frame nicely.

function GLBModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);

  // Auto-fit: compute bounding box, center to origin, scale to ~2 units tall,
  // and nudge down so the model sits nicely in the viewer frame.
  useEffect(() => {
    if (!groupRef.current) return;
    const box = new THREE.Box3().setFromObject(groupRef.current);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Target height ~1.8 units (fits well in camera fov 38° at distance 3.2)
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetHeight = 1.8;
    const scale = maxDim > 0 ? targetHeight / maxDim : 1;

    groupRef.current.scale.setScalar(scale);
    // Re-center after scaling, then shift down slightly so model is vertically
    // centered in the viewport (not floating at top).
    groupRef.current.position.x = -center.x * scale;
    groupRef.current.position.y = -center.y * scale - 0.15;
    groupRef.current.position.z = -center.z * scale;
  }, [scene]);

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}
