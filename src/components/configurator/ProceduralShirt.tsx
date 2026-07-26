// src/components/configurator/ProceduralShirt.tsx
// Procedural fallback "shirt" built from three.js primitives — used when no
// GLB model is registered for the product. Looks intentional (not a gray box)
// so the configurator is fully demoable without art assets.
//
// When a real GLB arrives (Phase 8+), this file stays as the graceful
// fallback; the viewer simply prefers GLB when `glbUrl` is non-null.

"use client";

import { useMemo } from "react";
import * as THREE from "three";

import type { LogoPlacement } from "@/types/uniform-3d";
import { ZONE_ANCHORS } from "@/data/uniform-3d";

interface ProceduralShirtProps {
  color: string;
  placements: LogoPlacement[];
  /** highlight this zone (e.g. when user is picking where to place logo) */
  highlightZone?: string | null;
}

export function ProceduralShirt({ color, placements, highlightZone }: ProceduralShirtProps) {
  const fabricMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: 0.85,
        metalness: 0.02,
      }),
    [color],
  );

  const collarMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color).multiplyScalar(0.82),
        roughness: 0.9,
      }),
    [color],
  );

  return (
    <group position={[0, 0, 0]}>
      {/* Torso — slightly tapered box */}
      <mesh material={fabricMaterial} castShadow receiveShadow>
        <boxGeometry args={[1.4, 1.7, 0.5]} />
      </mesh>

      {/* Shoulder bevel (top of torso) */}
      <mesh material={fabricMaterial} position={[0, 0.95, 0]}>
        <boxGeometry args={[1.6, 0.18, 0.5]} />
      </mesh>

      {/* Collar */}
      <mesh material={collarMaterial} position={[0, 0.95, 0.18]}>
        <boxGeometry args={[0.55, 0.12, 0.2]} />
      </mesh>

      {/* Left sleeve */}
      <mesh
        material={fabricMaterial}
        position={[-0.95, 0.55, 0]}
        rotation={[0, 0, 0.12]}
        castShadow
      >
        <capsuleGeometry args={[0.22, 0.7, 6, 12]} />
      </mesh>

      {/* Right sleeve */}
      <mesh
        material={fabricMaterial}
        position={[0.95, 0.55, 0]}
        rotation={[0, 0, -0.12]}
        castShadow
      >
        <capsuleGeometry args={[0.22, 0.7, 6, 12]} />
      </mesh>

      {/* Center placket (button line) */}
      <mesh position={[0, 0.05, 0.26]}>
        <boxGeometry args={[0.06, 1.5, 0.02]} />
        <meshStandardMaterial color={"#0a0a0a"} roughness={0.7} />
      </mesh>

      {/* Chest pockets (subtle) */}
      <mesh position={[-0.45, 0.35, 0.27]}>
        <boxGeometry args={[0.32, 0.32, 0.02]} />
        <meshStandardMaterial
          color={new THREE.Color(color).multiplyScalar(0.95)}
          roughness={0.9}
        />
      </mesh>
      <mesh position={[0.45, 0.35, 0.27]}>
        <boxGeometry args={[0.32, 0.32, 0.02]} />
        <meshStandardMaterial
          color={new THREE.Color(color).multiplyScalar(0.95)}
          roughness={0.9}
        />
      </mesh>

      {/* Embroidery zone markers — show anchor dots */}
      {(Object.keys(ZONE_ANCHORS) as Array<keyof typeof ZONE_ANCHORS>).map((zone) => {
        const anchor = ZONE_ANCHORS[zone];
        const isHighlighted = highlightZone === zone;
        const hasPlacement = placements.some((p) => p.zone === zone);
        return (
          <mesh
            key={zone}
            position={[anchor.x, anchor.y, anchor.z]}
          >
            <circleGeometry args={[isHighlighted ? 0.12 : 0.06, 24]} />
            <meshBasicMaterial
              color={
                hasPlacement
                  ? "#dc9814"
                  : isHighlighted
                    ? "#4a6bd8"
                    : "#94a3b8"
              }
              transparent
              opacity={isHighlighted || hasPlacement ? 0.95 : 0.35}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}

      {/* Render placed logos as small textured planes (Phase 4: placeholder texture) */}
      {placements.map((p) => {
        const anchor = ZONE_ANCHORS[p.zone];
        if (!anchor) return null;
        const width = p.widthCm / 30; // scale cm → model units (1 unit ≈ 30cm)
        const height = p.heightCm / 30;
        return (
          <mesh
            key={p.zone}
            position={[anchor.x, anchor.y, anchor.z + 0.01]}
            rotation={[0, 0, (p.rotation * Math.PI) / 180]}
          >
            <planeGeometry args={[width, height]} />
            <meshStandardMaterial
              color="#f8fafc"
              emissive="#dc9814"
              emissiveIntensity={0.12}
              roughness={0.6}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}
