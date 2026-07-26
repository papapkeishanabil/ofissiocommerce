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
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { RefObject } from "react";

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
  /** optional left + right sides for quad volumetric mesh. */
  leftColorImageSrc?: string;
  leftDepthImageSrc?: string;
  leftDepthStrength?: number;
  rightColorImageSrc?: string;
  rightDepthImageSrc?: string;
  rightDepthStrength?: number;
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
  leftColorImageSrc,
  leftDepthImageSrc,
  leftDepthStrength,
  rightColorImageSrc,
  rightDepthImageSrc,
  rightDepthStrength,
  placements = [],
  highlightZone,
  onCanvasReady,
}: Depth3DViewerProps) {
  const [front, setFront] = useState<LoadedImage | null>(null);
  const [back, setBack] = useState<LoadedImage | null>(null);
  const [left, setLeft] = useState<LoadedImage | null>(null);
  const [right, setRight] = useState<LoadedImage | null>(null);
  const quadGroupRef = useRef<THREE.Group | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setFront(null);
    setBack(null);
    setLeft(null);
    setRight(null);
    setError(null);

    const loaders: Promise<LoadedImage | null>[] = [
      // front (always)
      Promise.all([loadImage(colorImageSrc), loadImage(depthImageSrc)])
        .then(([color, depth]) => ({ color, depth, aspect: color.naturalWidth / color.naturalHeight })),
      // back (optional)
      backColorImageSrc && backDepthImageSrc
        ? Promise.all([loadImage(backColorImageSrc), loadImage(backDepthImageSrc)])
            .then(([color, depth]) => ({ color, depth, aspect: color.naturalWidth / color.naturalHeight }))
        : Promise.resolve(null),
      // left (optional)
      leftColorImageSrc && leftDepthImageSrc
        ? Promise.all([loadImage(leftColorImageSrc), loadImage(leftDepthImageSrc)])
            .then(([color, depth]) => ({ color, depth, aspect: color.naturalWidth / color.naturalHeight }))
        : Promise.resolve(null),
      // right (optional)
      rightColorImageSrc && rightDepthImageSrc
        ? Promise.all([loadImage(rightColorImageSrc), loadImage(rightDepthImageSrc)])
            .then(([color, depth]) => ({ color, depth, aspect: color.naturalWidth / color.naturalHeight }))
        : Promise.resolve(null),
    ];

    Promise.all(loaders)
      .then(([f, b, l, r]) => {
        if (cancelled) return;
        setFront(f ?? null);
        setBack(b ?? null);
        setLeft(l ?? null);
        setRight(r ?? null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? "Gagal memuat depth 3D.");
      });

    return () => {
      cancelled = true;
    };
  }, [
    colorImageSrc,
    depthImageSrc,
    backColorImageSrc,
    backDepthImageSrc,
    leftColorImageSrc,
    leftDepthImageSrc,
    rightColorImageSrc,
    rightDepthImageSrc,
  ]);

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
      {/* Wrap 4 mesh in a group so QuadVisibilityController can traverse &
          hide non-facing meshes each frame (eliminates overlap). */}
      <group ref={quadGroupRef}>
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
            placements={placements}
            highlightZone={highlightZone}
          />
        )}
        {/* Left mesh — rotated 90° around Y, photo texture from left side */}
        {left && (
          <DisplacedMesh
            color={left.color}
            depth={left.depth}
            aspect={left.aspect}
            depthStrength={leftDepthStrength ?? depthStrength}
            face="left"
          />
        )}
        {/* Right mesh — rotated -90° around Y */}
        {right && (
          <DisplacedMesh
            color={right.color}
            depth={right.depth}
            aspect={right.aspect}
            depthStrength={rightDepthStrength ?? depthStrength}
            face="right"
          />
        )}
      </group>
      {/* Only attach visibility controller when 3+ sides are loaded (quad). */}
      {left && right && (
        <QuadVisibilityController groupRef={quadGroupRef} />
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

/**
 * Quad visibility controller with CROSS-FADE. Instead of binary visible/hidden,
 * each frame we compute how aligned each face's outward normal is with the
 * camera's viewing direction, then set material opacity proportionally.
 *
 * Result: smooth transition between front→side→back→side as the customer
 * rotates, instead of a hard "snap" between faces.
 *
 * Face normals (outward):
 *   front  = +Z, back = -Z, left = +X, right = -X
 */
function QuadVisibilityController({
  groupRef,
}: {
  groupRef: RefObject<THREE.Group | null>;
}) {
  const camDir = useRef(new THREE.Vector3());

  useFrame(({ camera }) => {
    const root = groupRef.current;
    if (!root) return;

    camera.getWorldDirection(camDir.current);
    // The direction FROM camera TO origin = -camDir. We want faces whose
    // outward normal aligns with this "toward camera" vector.
    const towardCamX = -camDir.current.x;
    const towardCamZ = -camDir.current.z;

    root.children.forEach((child) => {
      if (child.type !== "Group") return;
      const face = child.userData?.face as string | undefined;
      if (!face) return;

      // Compute dot product of face normal with "toward camera" direction.
      // Range: 1 (face directly toward camera) → -1 (face directly away).
      let alignment = 0;
      if (face === "front") alignment = towardCamZ;       // normal +Z
      else if (face === "back") alignment = -towardCamZ;  // normal -Z
      else if (face === "left") alignment = towardCamX;   // normal +X
      else if (face === "right") alignment = -towardCamX; // normal -X

      // Smoothstep fade: fully visible when alignment > 0.3,
      // fully hidden when alignment < -0.2, smooth blend between.
      let opacity: number;
      if (alignment > 0.3) {
        opacity = 1;
      } else if (alignment < -0.2) {
        opacity = 0;
      } else {
        // Linear interpolate in the -0.2..0.3 range
        opacity = (alignment + 0.2) / 0.5;
      }
      opacity = Math.max(0, Math.min(1, opacity));

      // Apply to all Mesh materials inside this group
      child.visible = opacity > 0.01;
      child.traverse((grandchild) => {
        if (grandchild.type === "Mesh") {
          const mesh = grandchild as THREE.Mesh;
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat) {
            mat.transparent = true;
            mat.opacity = opacity;
          }
        }
      });
    });
  });
  return null;
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
  face?: "front" | "back" | "left" | "right";
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

    // Pull alpha pixels from the (no-bg) color image at the same resolution.
    // Vertices in fully transparent regions (background) get Z=0 so they
    // don't poke through as a "wall" when the mesh is viewed from the side.
    const aCanvas = document.createElement("canvas");
    aCanvas.width = SEG + 1;
    aCanvas.height = SEG + 1;
    const actx = aCanvas.getContext("2d")!;
    actx.drawImage(color, 0, 0, SEG + 1, SEG + 1);
    const alphaData = actx.getImageData(0, 0, SEG + 1, SEG + 1).data;

    // Plane sized to image aspect so the texture doesn't stretch.
    const width = aspect >= 1 ? 1.6 : 1.6 * aspect;
    const height = aspect >= 1 ? 1.6 / aspect : 1.6;
    const geo = new THREE.PlaneGeometry(width, height, SEG, SEG);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const lum = depthData[i * 4]! / 255; // 0 (far) .. 1 (near)
      const alpha = alphaData[i * 4 + 3]! / 255; // 0 (bg) .. 1 (product)
      // Displace +Z (toward viewer) when near AND inside the product silhouette.
      // Background vertices are flattened to z=0.
      const z = alpha > 0.1 ? (lum - 0.5) * depthStrength : 0;
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    const tex = new THREE.Texture(color);
    tex.colorSpace = THREE.SRGBColorSpace;
    // Force RGBA so the alpha channel (no-bg transparency) is preserved and
    // alphaTest in the material can discard background fragments.
    tex.format = THREE.RGBAFormat;
    tex.premultiplyAlpha = false;
    tex.needsUpdate = true;

    return { geometry: geo, texture: tex };
  }, [color, depth, aspect, depthStrength]);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: texture,
        // Foto sudah no-bg (RGBA) → pakai alpha channel untuk discard
        // background pixel supaya hanya produk yang ter-render (bukan "wall"
        // background disekitar produk saat di-rotate).
        transparent: true,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
        roughness: 0.85,
        metalness: 0.02,
      }),
    [texture],
  );

  // Back mesh: flip 180° around Y so it faces -Z (away from front), and
  // mirror X scale so the back photo reads correctly (not mirrored) when
  // viewed from behind the front mesh.
  // Left/right meshes: rotate ±90° around Y so they face ±X.
  const groupRotation: [number, number, number] =
    face === "back"
      ? [0, Math.PI, 0]
      : face === "left"
        ? [0, Math.PI / 2, 0]
        : face === "right"
          ? [0, -Math.PI / 2, 0]
          : [0, 0, 0];
  const groupScale: [number, number, number] = face === "back" ? [-1, 1, 1] : [1, 1, 1];

  return (
    <group
      rotation={groupRotation}
      scale={groupScale}
      userData={{ face }}
      ref={(g) => {
        if (g) g.userData.face = face;
      }}
    >
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
