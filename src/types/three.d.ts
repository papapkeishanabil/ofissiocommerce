// src/types/three.d.ts
// React Three Fiber v9 + React 19: R3F v9 exposes ThreeElements and augments
// the React JSX runtime. We surface it under the React JSX namespace so
// <mesh>, <group>, <boxGeometry>, <ambientLight>, etc. are typed everywhere.

import type { ThreeElements } from "@react-three/fiber";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

export {};
