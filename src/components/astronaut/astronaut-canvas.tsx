"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { AstronautModel, type RigNodes } from "@/components/astronaut/astronaut-model";
import {
  sampleArrive,
  sampleDepart,
  sampleIdle,
  sampleTalk,
  type Pose,
} from "@/components/astronaut/animations";
import type { AstronautCanvasProps, AstronautFrame } from "@/components/astronaut/types";

function applyPose(rig: RigNodes, pose: Pose) {
  rig.root?.position.set(pose.x, pose.y, pose.z);
  rig.root?.rotation.set(pose.rx, pose.ry, pose.rz);
  rig.squash?.scale.set(pose.sx, pose.sy, pose.sz);
  rig.head?.rotation.set(pose.headX, pose.headY, pose.headZ);
  rig.armL?.rotation.set(pose.armLX, 0, pose.armL);
  rig.armR?.rotation.set(pose.armRX, 0, pose.armR);
  rig.legL?.rotation.set(pose.legL, 0, 0.04);
  rig.legR?.rotation.set(pose.legR, 0, -0.04);
}

function Framing({ frame }: { frame: AstronautFrame }) {
  const camera = useThree((state) => state.camera);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  useEffect(() => {
    const aspect = width / Math.max(height, 1);
    if (frame === "hero") {
      const distance = aspect < 0.75 ? 8.7 : 8.2;
      camera.position.set(0.9, 1.32, distance);
      camera.lookAt(0, 1.4, 0);
    } else {
      const distance = aspect < 0.9 ? 6.85 : 6.25;
      camera.position.set(0.85, 1.22, distance);
      camera.lookAt(0, 1.05, 0);
    }
    camera.updateProjectionMatrix();
  }, [camera, frame, height, width]);
  return null;
}

function useDustTexture() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    if (!context) return null;
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(236,230,220,0.9)");
    gradient.addColorStop(0.45, "rgba(190,182,170,0.28)");
    gradient.addColorStop(1, "rgba(190,182,170,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
}

function Dust({ burst }: { burst: number }) {
  const group = useRef<THREE.Group>(null);
  const life = useRef(8);
  const texture = useDustTexture();
  const specs = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const angle = (i / 14) * Math.PI * 2;
        return {
          angle,
          speed: 0.45 + (i % 5) * 0.14,
          up: 0.35 + (i % 4) * 0.22,
          size: 0.16 + (i % 3) * 0.08,
        };
      }),
    [],
  );

  useEffect(() => {
    if (burst > 0) life.current = 0;
  }, [burst]);

  useFrame((_, dt) => {
    const root = group.current;
    if (!root) return;
    life.current += Math.min(dt, 0.05);
    const t = life.current;
    const fade = burst === 0 ? 0 : Math.max(0, 1 - t / 0.85);
    root.children.forEach((child, index) => {
      const spec = specs[index];
      if (!spec) return;
      child.position.set(
        Math.cos(spec.angle) * spec.speed * t,
        Math.max(0, spec.up * t - 0.9 * t * t),
        Math.sin(spec.angle) * spec.speed * t * 0.4,
      );
      const sprite = child as THREE.Sprite;
      const scale = spec.size * (0.6 + t * 2.4);
      sprite.scale.set(scale, scale, 1);
      sprite.material.opacity = fade * 0.7;
    });
  });

  if (!texture) return null;

  return (
    <group ref={group} position={[0, 0.05, 0.2]}>
      {specs.map((_, index) => (
        <sprite key={index}>
          <spriteMaterial map={texture} transparent opacity={0} depthWrite={false} />
        </sprite>
      ))}
    </group>
  );
}

function Pedestal({ accent }: { accent: string }) {
  return (
    <group position={[0, -0.02, 0]}>
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.98, 1.08, 0.12, 48]} />
        <meshStandardMaterial color="#101624" metalness={0.45} roughness={0.32} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.78, 0.94, 64]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
      <pointLight color={accent} intensity={3.2} distance={3.4} position={[0, 0.25, 0.2]} />
    </group>
  );
}

function BlobShadow() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    if (!context) return null;
    const gradient = context.createRadialGradient(64, 64, 8, 64, 64, 64);
    gradient.addColorStop(0, "rgba(0,0,0,0.5)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, []);
  if (!texture) return null;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0.05]}>
      <planeGeometry args={[1.8, 1.1]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

function Rig({
  colors,
  animation,
  onComplete,
  onImpact,
  onBurst,
}: AstronautCanvasProps & { onBurst: () => void }) {
  const rig = useRef<RigNodes>(null);
  const clock = useRef(0);
  const finished = useRef(false);
  const impacted = useRef(false);
  const snapped = useRef(false);
  const start = useRef({ x: 8, y: 2.4 });
  const end = useRef({ x: 8, y: 3.2 });
  const onCompleteRef = useRef(onComplete);
  const onImpactRef = useRef(onImpact);
  const onBurstRef = useRef(onBurst);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onImpactRef.current = onImpact;
    onBurstRef.current = onBurst;
  }, [onBurst, onComplete, onImpact]);

  useEffect(() => {
    clock.current = 0;
    finished.current = false;
    impacted.current = false;
    snapped.current = false;
  }, [animation]);

  useFrame((state, delta) => {
    const step = Math.min(delta, 0.05);
    if (!snapped.current) {
      snapped.current = true;
      start.current = {
        x: state.viewport.width / 2 + 1.15,
        y: 1.15 + state.viewport.height * 0.22,
      };
      end.current = {
        x: state.viewport.width / 2 + 1.35,
        y: 1.4 + state.viewport.height * 0.32,
      };
    }
    clock.current += step;
    const t = clock.current;
    const sample =
      animation === "arrive"
        ? sampleArrive(t, start.current.x, start.current.y)
        : animation === "depart"
          ? sampleDepart(t, end.current.x, end.current.y)
          : animation === "talk"
            ? sampleTalk(t)
            : sampleIdle(t);
    const nodes = rig.current;
    if (!nodes?.root) return;
    applyPose(nodes, sample.pose);
    if (nodes.thrust) {
      const scale = sample.thrust;
      nodes.thrust.scale.setScalar(scale);
      nodes.thrust.visible = scale > 0.02;
    }
    if (sample.impact && !impacted.current) {
      impacted.current = true;
      onBurstRef.current();
      onImpactRef.current?.();
    }
    if (sample.done && !finished.current) {
      finished.current = true;
      onCompleteRef.current?.(animation);
    }
  });

  return <AstronautModel ref={rig} colors={colors} />;
}

function Scene({
  colors,
  animation,
  frame = "hero",
  onComplete,
  onImpact,
}: AstronautCanvasProps) {
  const [burst, setBurst] = useState(0);

  return (
    <>
      <Framing frame={frame} />
      <ambientLight intensity={0.42} color="#d5def8" />
      <directionalLight position={[3.4, 5.2, 3.2]} intensity={2.15} color="#fff7ee" />
      <directionalLight position={[-3.2, 1.6, -1.5]} intensity={0.55} color="#8eb6ff" />
      <pointLight position={[2.4, 3.1, 2.4]} intensity={10} distance={12} color="#ffffff" />
      <Environment resolution={128}>
        <Lightformer intensity={3.2} color="#ffffff" position={[2.6, 3, 2]} scale={[4, 4, 1]} />
        <Lightformer intensity={1.6} color="#8fe7ff" position={[-3.5, 1, -1]} scale={[2, 5, 1]} />
        <Lightformer intensity={0.8} color="#2a1848" position={[0, -1, 3]} scale={[6, 2, 1]} />
      </Environment>
      <Rig
        colors={colors}
        animation={animation}
        onComplete={onComplete}
        onImpact={onImpact}
        onBurst={() => setBurst((value) => value + 1)}
      />
      {frame === "stage" ? <Pedestal accent={colors.accent} /> : <BlobShadow />}
      <Dust burst={burst} />
    </>
  );
}

export function AstronautCanvas({
  colors,
  animation,
  frame = "hero",
  onComplete,
  onImpact,
  className,
}: AstronautCanvasProps) {
  return (
    <Canvas
      className={className}
      style={{ pointerEvents: "none", width: "100%", height: "100%" }}
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0.2, 1.2, 5.4], fov: frame === "hero" ? 33 : 30, near: 0.1, far: 40 }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor(0x000000, 0);
        scene.background = null;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <Scene
        colors={colors}
        animation={animation}
        frame={frame}
        onComplete={onComplete}
        onImpact={onImpact}
      />
    </Canvas>
  );
}
