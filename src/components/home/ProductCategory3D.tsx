"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";

function Model({ url, autoRotate }: { url: string; autoRotate: boolean }) {
  const { scene } = useGLTF(url);
  const group = useRef<THREE.Group>(null);

  const fitted = useMemo(() => {
    const cloned = scene.clone(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    const scale = 2.0 / maxDim;

    cloned.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.scale.multiplyScalar(scale);
      mesh.position.sub(center.clone().multiplyScalar(scale));
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat && mat.isMeshStandardMaterial) {
        mat.metalness = 0;
        mat.roughness = 0.72;
        mat.envMapIntensity = 0.2;
        if (mat.map) {
          mat.emissiveMap = mat.map;
          mat.emissive = new THREE.Color("#ffffff");
          mat.emissiveIntensity = 0.4;
        }
      }
    });
    return cloned;
  }, [scene]);

  useFrame((_, delta) => {
    if (group.current && autoRotate) {
      group.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group ref={group}>
      <primitive object={fitted} />
    </group>
  );
}

export function ProductCategory3D({ url, autoRotate = true }: { url: string; autoRotate?: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.3, 4], fov: 35 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.1;
      }}
      style={{ width: "100%", height: "100%", cursor: "grab" }}
    >
      <ambientLight intensity={0.8} />
      <hemisphereLight args={["#ffffff", "#142766", 0.5]} />
      <directionalLight position={[3, 5, 4]} intensity={1.5} />
      <directionalLight position={[-4, 2, -3]} intensity={0.4} color="#dc9814" />
      <Suspense fallback={null}>
        <Model url={url} autoRotate={autoRotate} />
      </Suspense>
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={!autoRotate ? false : undefined}
        minPolarAngle={Math.PI * 0.25}
        maxPolarAngle={Math.PI * 0.75}
      />
    </Canvas>
  );
}
