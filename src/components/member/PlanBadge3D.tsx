"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { PMREMGenerator } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

type Props = {
  modelSrc: string;
  glow: string;
  className?: string;
  /** Carousel spins; dialog stays front-facing and centered. */
  variant?: "hero" | "dialog";
};

// Local studio reflections so the chrome/gold read correctly without fetching an HDRI.
function StudioEnvironment() {
  const gl = useThree((s) => s.gl);
  const env = useMemo(() => {
    const pmrem = new PMREMGenerator(gl);
    const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return texture;
  }, [gl]);
  useEffect(() => () => env.dispose(), [env]);
  return <primitive attach="environment" object={env} />;
}

function Model({ src, fit }: { src: string; fit: number }) {
  const { scene } = useGLTF(src);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    clone.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      clone.scale.multiplyScalar(fit / maxDim);
    }
    return clone;
  }, [scene, fit]);
  return <primitive object={model} />;
}

export function PlanBadge3D({
  modelSrc,
  glow,
  className = "h-64 w-full",
  variant = "hero",
}: Props) {
  const isDialog = variant === "dialog";
  const wrapRef = useRef<HTMLDivElement>(null);

  // The plan carousel is a framer-motion drag="x" parent; stop pointerdown natively so
  // rotating the badge doesn't also swipe to the next plan.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const stop = (e: PointerEvent) => e.stopPropagation();
    el.addEventListener("pointerdown", stop);
    return () => el.removeEventListener("pointerdown", stop);
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`relative touch-none ${isDialog ? "cursor-default" : "cursor-grab active:cursor-grabbing"} ${className}`}
      style={{ filter: `drop-shadow(0 0 24px ${glow})` }}
    >
      <Canvas
        className="!block h-full w-full"
        camera={{
          position: isDialog ? [0, 0, 8.5] : [0, 0.35, 9],
          fov: isDialog ? 32 : 35,
        }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
      >
        <StudioEnvironment />
        <ambientLight intensity={0.4} />
        <directionalLight position={[-4, 6, 6]} intensity={2.2} />
        <directionalLight position={[5, 2, 4]} intensity={1} />
        <pointLight position={[0, 1, -4]} intensity={30} color="#3b82f6" />
        <Suspense fallback={null}>
          <Model src={modelSrc} fit={isDialog ? 3.35 : 3.1} />
        </Suspense>
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          enableRotate={!isDialog}
          enableDamping
          autoRotate={!isDialog}
          autoRotateSpeed={2.5}
          target={[0, 0, 0]}
          minPolarAngle={Math.PI / 2 - 0.45}
          maxPolarAngle={Math.PI / 2 + 0.2}
        />
      </Canvas>
    </div>
  );
}
