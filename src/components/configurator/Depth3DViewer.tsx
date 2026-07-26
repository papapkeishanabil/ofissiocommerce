// src/components/configurator/Depth3DViewer.tsx
// 3D mesh built from a single product photo + pre-computed depth map.
//
// Pipeline:
//   1. Load color image (the product photo) and depth image (grayscale PNG).
//   2. Build a subdivided plane geometry (e.g. 128x128).
//   3. Read depth pixel luminance → set Z displacement per vertex.
//   4. Use the color image as the mesh texture.
//   5. Render in R3F with OrbitControls → customer can rotate 360°.
//
// Logo overlays use the same ZONE_ANCHORS as the procedural shape, projected
// onto the displaced surface (approximate — fine for chest/back where the
// surface is mostly fronto-parallel).
//
// Limitations (honest):
//   - Back side of mesh has no data (depth was estimated from front only),
//     so rotating to the back shows the texture from behind / mirrored.
//   - Depth noise at silhouette edges is expected for apparel.

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

import type { LogoPlacement } from "@/types/uniform-3d";
import { ZONE_ANCHORS } from "@/data/uniform-3d";

interface Depth3DViewerProps {
  colorImageSrc: string;
  depthImageSrc: string;
  /** depth strength (model units). Higher = more 3D pop. ~0.4 default. */
  depthStrength?: number;
  /** optional back side (color + depth) for full 360° rotation. */
  backColorImageSrc?: string;
  backDepthImageSrc?: string;
  backDepthStrength?: number;
  placements?: LogoPlacement[];
  highlightZone?: string | null;
  onCanvasReady?: (gl: { domElement: HTMLCanvasElement }) => void;
}

interface LoadedImage {
  color: HTMLImageElement;
  depth: HTMLImageElement;
  aspect: number;
}

export function Depth3DViewer({
  colorImageSrc,
  depthImageSrc,
  depthStrength = 0.5,
  backColorImageSrc,
  backDepthImageSrc,
  backDepthStrength,
  placements = [],
  highlightZone,
  onCanvasReady,
}: Depth3DViewerProps) {
  const [front, setFront] = useState<LoadedImage | null>(null);
  const [back, setBack] = useState<LoadedImage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setFront(null);
    setBack(null);
    setError(null);

    const frontP = Promise.all([loadImage(colorImageSrc), loadImage(depthImageSrc)])
      .then(([color, depth]) => ({ color, depth, aspect: color.naturalWidth / color.naturalHeight }));

    const backP = backColorImageSrc && backDepthImageSrc
      ? Promise.all([loadImage(backColorImageSrc), loadImage(backDepthImageSrc)])
          .then(([color, depth]) => ({ color, depth, aspect: color.naturalWidth / color.naturalHeight }))
      : Promise.resolve(null);

    Promise.all([frontP, backP])
      .then(([f, b]) => {
        if (cancelled) return;
        setFront(f);
        setBack(b);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? "Gagal memuat depth 3D.");
      });

    return () => {
      cancelled = true;
    };
  }, [colorImageSrc, depthImageSrc, backColorImageSrc, backDepthImageSrc]);

  if (error) {
    return (
      <div className="grid h-full w-full place-items-center bg-surface-muted p-6 text-center">
        <p className="text-xs text-red-600">{error}</p>
      </div>
    );
  }

  if (!front) {
    return (
      <div className="grid h-full w-full place-items-center bg-gradient-to-br from-cool-100 to-cool-200">
        <div className="flex flex-col items-center gap-2 text-ink-muted">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-300 border-t-brand-700" />
          <span className="text-xs font-medium">Membangun model 3D dari depth…</span>
        </div>
      </div>
    );
  }

  return (
    <Canvas
      shadows
      camera={{ position: [0, 0, 3.2], fov: 38 }}
      dpr={[1, 2]}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      onCreated={({ gl }) => onCanvasReady?.({ domElement: gl.domElement })}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      <ambientLight intensity={0.85} />
      <directionalLight position={[3, 4, 5]} intensity={1.0} />
      <directionalLight position={[-3, 1, -2]} intensity={0.3} color="#a8baff" />
      {/* Front mesh — visible when camera is in front (z > 0) */}
      <DisplacedMesh
        color={front.color}
        depth={front.depth}
        aspect={front.aspect}
        depthStrength={depthStrength}
        face="front"
        placements={placements}
        highlightZone={highlightZone}
      />
      {/* Back mesh — flipped, only built if back photo provided */}
      {back && (
        <DisplacedMesh
          color={back.color}
          depth={back.depth}
          aspect={back.aspect}
          depthStrength={backDepthStrength ?? depthStrength}
          face="back"
        />
      )}
      <OrbitControls
        target={[0, 0, 0]}
        minDistance={1.6}
        maxDistance={5}
        enablePan={false}
        makeDefault
      />
    </Canvas>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Tidak dapat memuat ${src}`));
    img.src = src;
  });
}

interface DisplacedMeshProps {
  color: HTMLImageElement;
  depth: HTMLImageElement;
  aspect: number;
  depthStrength: number;
  /** which side this mesh represents — affects facing & logo anchors */
  face?: "front" | "back";
  placements?: LogoPlacement[];
  highlightZone?: string | null;
}

function DisplacedMesh({
  color,
  depth,
  aspect,
  depthStrength,
  face = "front",
  placements = [],
  highlightZone,
}: DisplacedMeshProps) {
  // Build displaced geometry + texture once per image change.
  const { geometry, texture } = useMemo(() => {
    // Resolution of the displacement grid — balance detail vs perf.
    const SEG = 128;

    // Pull depth pixels at the grid resolution.
    const dCanvas = document.createElement("canvas");
    dCanvas.width = SEG + 1;
    dCanvas.height = SEG + 1;
    const dctx = dCanvas.getContext("2d")!;
    dctx.drawImage(depth, 0, 0, SEG + 1, SEG + 1);
    const depthData = dctx.getImageData(0, 0, SEG + 1, SEG + 1).data;

    // Plane sized to image aspect so the texture doesn't stretch.
    const width = aspect >= 1 ? 1.6 : 1.6 * aspect;
    const height = aspect >= 1 ? 1.6 / aspect : 1.6;
    const geo = new THREE.PlaneGeometry(width, height, SEG, SEG);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      // depth pixel: luminance from RGB (grayscale image → R=G=B)
      const lum = depthData[i * 4]! / 255; // 0 (far) .. 1 (near)
      // Displace +Z (toward viewer) when near.
      pos.setZ(i, (lum - 0.5) * depthStrength);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    const tex = new THREE.Texture(color);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;

    return { geometry: geo, texture: tex };
  }, [color, depth, aspect, depthStrength]);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.FrontSide,
        roughness: 0.85,
        metalness: 0.02,
      }),
    [texture],
  );

  // Back mesh: flip 180° around Y so it faces -Z (away from front), and
  // mirror X scale so the back photo reads correctly (not mirrored) when
  // viewed from behind the front mesh.
  const groupRotation: [number, number, number] = face === "back" ? [0, Math.PI, 0] : [0, 0, 0];
  const groupScale: [number, number, number] = face === "back" ? [-1, 1, 1] : [1, 1, 1];

  return (
    <group rotation={groupRotation} scale={groupScale}>
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
      {/* Logo placements only on the front mesh (chest zones); back zones
          (upper_back/middle_back) shown on back mesh. */}
      {placements
        .filter((p) => {
          const isBackZone = p.zone === "upper_back" || p.zone === "middle_back";
          return face === "back" ? isBackZone : !isBackZone;
        })
        .map((p) => {
          const anchor = ZONE_ANCHORS[p.zone];
          if (!anchor) return null;
          const width = (p.widthCm / 30) * 0.9;
          const height = (p.heightCm / 30) * 0.9;
          const isHi = highlightZone === p.zone;
          // For back mesh, the Z anchor needs to be negated (we're flipped).
          const zPos = face === "back" ? -anchor.z + 0.05 : anchor.z + 0.05;
          const xPos = face === "back" ? -anchor.x : anchor.x;
          return (
            <mesh
              key={`${face}-${p.zone}`}
              position={[xPos, anchor.y, zPos]}
              rotation={[0, 0, (p.rotation * Math.PI) / 180]}
            >
              <planeGeometry args={[width, height]} />
              <meshStandardMaterial
                color={p.logoPreviewUrl ? "#ffffff" : "#f8fafc"}
                emissive="#dc9814"
                emissiveIntensity={isHi ? 0.35 : 0.12}
                roughness={0.6}
                side={THREE.DoubleSide}
              />
            </mesh>
          );
        })}
    </group>
  );
}
