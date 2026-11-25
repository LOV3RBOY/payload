"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { buildClipRegistry, listGestures } from "@/components/astronaut/clip-registry";
import type { AstronautCanvasProps } from "@/components/astronaut/types";
import { clipForGesture } from "@/lib/gestures";

export const AIRTIME_URL = "/models/airtime-rigged.glb";
export const AIRTIME_FALLBACK_URL = "/models/airtime-rigged-uncompressed.glb";

const DEFAULT_SUIT = "#f4f7fb";
const DEFAULT_VISOR = "#12141c";
const DEFAULT_ACCENT = "#5ce1ff";
const HEAD_BONE = "mixamorig:Head";

function hexRgb(hex: string) {
  const n = Number.parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function paintAlbedo(
  source: CanvasImageSource & { width: number; height: number },
  suit: string,
  visor: string,
  accent: string,
) {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(source, 0, 0);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;
  const suitC = hexRgb(suit);
  const visorC = hexRgb(visor);
  const accentC = hexRgb(accent);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const cyan = Math.max(b - r, g - r) / 255;
    const visorMask = luma < 0.2 ? 1 : luma < 0.32 ? (0.32 - luma) / 0.12 : 0;
    const accentMask = Math.min(1, Math.max(0, (cyan - 0.05) / 0.12)) * (1 - visorMask);
    const suitMask = Math.max(0, 1 - visorMask - accentMask);
    const suitShade = Math.min(1.15, Math.max(0.45, luma / 0.8));
    const accentShade = Math.min(1.4, Math.max(0.45, luma / 0.6));
    data[i] = Math.min(255, suitC.r * suitShade * suitMask + visorC.r * visorMask * (0.2 + luma) + accentC.r * accentShade * accentMask);
    data[i + 1] = Math.min(255, suitC.g * suitShade * suitMask + visorC.g * visorMask * (0.2 + luma) + accentC.g * accentShade * accentMask);
    data[i + 2] = Math.min(255, suitC.b * suitShade * suitMask + visorC.b * visorMask * (0.2 + luma) + accentC.b * accentShade * accentMask);
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.needsUpdate = true;
  return texture;
}

function quatClose(a: THREE.Quaternion, b: THREE.Quaternion) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z) + Math.abs(a.w - b.w) < 1e-4;
}

export function Airtime({
  url = AIRTIME_URL,
  colors,
  animation,
  gesture = null,
  gestureToken = 0,
  onComplete,
  onImpact,
  onGestureEnd,
  onBurst,
}: AstronautCanvasProps & { url?: string; onBurst: () => void }) {
  const gltf = useGLTF(url, false, true) as { scene: THREE.Group; animations: THREE.AnimationClip[] };
  const cloned = useMemo(() => cloneSkeleton(gltf.scene) as THREE.Group, [gltf.scene]);
  const mixer = useMemo(() => new THREE.AnimationMixer(cloned), [cloned]);
  const registry = useMemo(() => buildClipRegistry(gltf.animations), [gltf.animations]);
  const actions = useMemo(() => {
    const map = new Map<string, THREE.AnimationAction>();
    for (const clip of gltf.animations) {
      const action = mixer.clipAction(clip, cloned);
      action.enabled = true;
      map.set(clip.name, action);
    }
    return map;
  }, [cloned, gltf.animations, mixer]);
  const suitMaterial = useMemo(() => {
    const found: { current: THREE.MeshStandardMaterial | null } = { current: null };
    cloned.traverse((object) => {
      const skinned = object as THREE.SkinnedMesh;
      if (!skinned.isSkinnedMesh || found.current) return;
      skinned.frustumCulled = false;
      skinned.castShadow = false;
      const source = skinned.material as THREE.MeshStandardMaterial;
      const material = source.clone();
      material.color.set("#ffffff");
      skinned.material = material;
      found.current = material;
    });
    return found.current;
  }, [cloned]);

  const squash = useRef<THREE.Group>(null);
  const beat = useRef("");
  const current = useRef<THREE.AnimationAction | null>(null);
  const queue = useRef<string[]>([]);
  const finished = useRef(false);
  const impacted = useRef(false);
  const gestureActive = useRef(false);
  const seenGesture = useRef(0);
  const animationRef = useRef(animation);
  const onCompleteRef = useRef(onComplete);
  const onImpactRef = useRef(onImpact);
  const onGestureEndRef = useRef(onGestureEnd);
  const onBurstRef = useRef(onBurst);
  const pointer = useRef({ x: 0, y: 0 });
  const lookScratch = useMemo(
    () => ({
      euler: new THREE.Euler(),
      delta: new THREE.Quaternion(),
      base: new THREE.Quaternion(),
      applied: new THREE.Quaternion(),
    }),
    [],
  );

  const head = useMemo(() => cloned.getObjectByName(HEAD_BONE) as THREE.Bone | undefined, [cloned]);

  const play = useCallback(
    (name: string, once: boolean, fade = 0.22) => {
      const clip = registry.get(name) ?? registry.get(name.toLowerCase());
      const next = clip ? actions.get(clip.name) : undefined;
      if (!next || !clip) return false;
      actions.forEach((action) => {
        if (action !== next && (action.isRunning() || action === current.current)) action.fadeOut(fade);
      });
      next.enabled = true;
      next.reset();
      next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
      next.clampWhenFinished = once;
      next.fadeIn(fade).play();
      current.current = next;
      beat.current = clip.name;
      return true;
    },
    [actions, registry],
  );

  useEffect(() => {
    animationRef.current = animation;
    onCompleteRef.current = onComplete;
    onImpactRef.current = onImpact;
    onGestureEndRef.current = onGestureEnd;
    onBurstRef.current = onBurst;
  }, [animation, onBurst, onComplete, onGestureEnd, onImpact]);

  useEffect(() => {
    cloned.traverse((object) => {
      const mesh = object as THREE.SkinnedMesh;
      if (!mesh.isSkinnedMesh) return;
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (!material || Array.isArray(material)) return;
      material.color.set(colors.suit);
      if (!material.userData.sourceMap && material.map) material.userData.sourceMap = material.map;
      const source = (material.userData.sourceMap as THREE.Texture | undefined) ?? material.map;
      const image = source?.image as (CanvasImageSource & { width?: number; height?: number }) | undefined;
      if (!source || !image?.width || !image.height) return;
      const unchanged =
        colors.suit.toLowerCase() === DEFAULT_SUIT &&
        colors.visor.toLowerCase() === DEFAULT_VISOR &&
        colors.accent.toLowerCase() === DEFAULT_ACCENT;
      if (unchanged) {
        material.map = source;
        material.needsUpdate = true;
        return;
      }
      const painted = paintAlbedo(
        image as CanvasImageSource & { width: number; height: number },
        colors.suit,
        colors.visor,
        colors.accent,
      );
      const previous = material.userData.paintedMap as THREE.Texture | undefined;
      if (!painted) return;
      if (previous && previous !== source) previous.dispose();
      material.userData.paintedMap = painted;
      material.map = painted;
      material.color.set("#ffffff");
      material.needsUpdate = true;
    });
  }, [cloned, colors.accent, colors.suit, colors.visor, suitMaterial]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = (event.clientY / window.innerHeight) * 2 - 1;
      pointer.current.x += (x - pointer.current.x) * 0.15;
      pointer.current.y += (y - pointer.current.y) * 0.15;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    const onFinished = (event: { action: THREE.AnimationAction }) => {
      if (event.action !== current.current) return;
      if (gestureActive.current) {
        gestureActive.current = false;
        const back = animationRef.current === "talk" ? "Talk" : "Idle";
        if (!play(back, false, 0.28)) play("Idle", false, 0.28);
        onGestureEndRef.current?.();
        return;
      }
      while (queue.current.length > 0) {
        const next = queue.current.shift();
        if (next && play(next, true, 0.18)) return;
      }
      const anim = animationRef.current;
      if ((anim === "arrive" || anim === "depart") && !finished.current) {
        finished.current = true;
        onCompleteRef.current?.(anim);
      }
    };
    mixer.addEventListener("finished", onFinished);
    return () => mixer.removeEventListener("finished", onFinished);
  }, [mixer, play]);

  useEffect(() => {
    finished.current = false;
    impacted.current = false;
    if (gestureActive.current && (animation === "idle" || animation === "talk")) return;
    gestureActive.current = false;
    queue.current = [];
    if (animation === "arrive") {
      queue.current = ["Land", "DustOff"];
      if (!play("FlyIn", true, 0.12)) {
        queue.current = ["DustOff"];
        if (!play("Land", true, 0.12)) play("Idle", false, 0.2);
      }
      return;
    }
    if (animation === "depart") {
      queue.current = ["FlyOff"];
      if (!play("Wave", true, 0.16)) play("FlyOff", true, 0.16);
      return;
    }
    if (animation === "talk") {
      if (!play("Talk", false, 0.25)) play("Idle", false, 0.25);
      return;
    }
    play("Idle", false, 0.3);
  }, [animation, play]);

  useEffect(() => {
    if (!gesture || gestureToken === seenGesture.current) return;
    seenGesture.current = gestureToken;
    if (animation !== "talk" && animation !== "idle") return;
    const clip = clipForGesture(gesture);
    if (!clip) return;
    gestureActive.current = true;
    queue.current = [];
    play(clip, true, 0.16);
  }, [animation, gesture, gestureToken, play]);

  useEffect(() => {
    return () => {
      mixer.stopAllAction();
      cloned.traverse((object) => {
        const mesh = object as THREE.SkinnedMesh;
        if (!mesh.isSkinnedMesh) return;
        const material = mesh.material;
        if (material && !Array.isArray(material)) material.dispose();
      });
    };
  }, [cloned, mixer]);

  useFrame((_, delta) => {
    const step = Math.min(delta, 0.05);
    mixer.update(step);
    const action = current.current;
    if (beat.current === "Land" && action && action.time > 0.22 && !impacted.current) {
      impacted.current = true;
      onBurstRef.current();
      onImpactRef.current?.();
    }

    let squashX = 1;
    let squashY = 1;
    if (beat.current === "Land" && action && action.time > 0.1 && action.time < 0.46) {
      const k = Math.sin(((action.time - 0.1) / 0.36) * Math.PI);
      squashY = 1 - 0.1 * k;
      squashX = 1 + 0.05 * k;
    }
    if (squash.current) squash.current.scale.set(squashX, squashY, squashX);

    const looking = !gestureActive.current && (beat.current === "Idle" || beat.current === "Talk");
    if (head && looking) {
      if (!quatClose(head.quaternion, lookScratch.applied)) lookScratch.base.copy(head.quaternion);
      lookScratch.euler.set(-pointer.current.y * 0.06, pointer.current.x * 0.08, 0);
      lookScratch.delta.setFromEuler(lookScratch.euler);
      head.quaternion.copy(lookScratch.base).multiply(lookScratch.delta);
      lookScratch.applied.copy(head.quaternion);
    }
  });

  return (
    <group ref={squash}>
      <primitive object={cloned} position={[0, 0.01, 0]} />
    </group>
  );
}

export function knownGestures(clips: THREE.AnimationClip[]) {
  return listGestures(clips);
}

useGLTF.preload(AIRTIME_URL, false, true);
