"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { CLIP_PREFERENCES, buildClipRegistry, findClip, listGestures } from "@/components/astronaut/clip-registry";
import type { AstronautCanvasProps } from "@/components/astronaut/types";

export const AIRTIME_URL = "/models/airtime.glb";
export const AIRTIME_FALLBACK_URL = "/models/airtime-uncompressed.glb";

const DEFAULT_SUIT = "#f4f7fb";
const DEFAULT_VISOR = "#12141c";
const DEFAULT_ACCENT = "#5ce1ff";

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

function easeIn(t: number) {
  return t * t * t;
}

function clamp01(t: number) {
  return Math.min(1, Math.max(0, t));
}

export function Airtime({
  url = AIRTIME_URL,
  colors,
  animation,
  onComplete,
  onImpact,
  onBurst,
}: AstronautCanvasProps & { url?: string; onBurst: () => void }) {
  const gltf = useGLTF(url, false, true) as { scene: THREE.Group; animations: THREE.AnimationClip[] };
  const viewport = useThree((state) => state.viewport);
  const cloned = useMemo(() => cloneSkeleton(gltf.scene) as THREE.Group, [gltf.scene]);
  const mixer = useMemo(() => new THREE.AnimationMixer(cloned), [cloned]);
  const registry = useMemo(() => buildClipRegistry(gltf.animations), [gltf.animations]);
  const actions = useMemo(() => {
    const map = new Map<string, THREE.AnimationAction>();
    for (const clip of gltf.animations) {
      const action = mixer.clipAction(clip, cloned);
      action.enabled = true;
      action.setLoop(THREE.LoopRepeat, Infinity);
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

  const motion = useRef<THREE.Group>(null);
  const squash = useRef<THREE.Group>(null);
  const clock = useRef(0);
  const beat = useRef("");
  const current = useRef<THREE.AnimationAction | null>(null);
  const finished = useRef(false);
  const impacted = useRef(false);
  const snapped = useRef(false);
  const start = useRef({ x: 2.2, y: 1.1 });
  const away = useRef({ x: 2.4, y: 1.4 });
  const pointer = useRef({ x: 0, y: 0 });
  const onCompleteRef = useRef(onComplete);
  const onImpactRef = useRef(onImpact);
  const onBurstRef = useRef(onBurst);
  const scratch = useMemo(
    () => ({
      q: new THREE.Quaternion(),
      qWorld: new THREE.Quaternion(),
      from: new THREE.Vector3(),
      to: new THREE.Vector3(),
      bonePos: new THREE.Vector3(),
      childPos: new THREE.Vector3(),
      euler: new THREE.Euler(),
      waveTarget: new THREE.Vector3(-0.85, 0.55, 0.25).normalize(),
      qLocal: new THREE.Quaternion(),
    }),
    [],
  );

  const bones = useMemo(() => {
    const find = (name: string) => cloned.getObjectByName(name) as THREE.Bone | undefined;
    return {
      head: find("Head"),
      spine: find("Spine"),
      spine01: find("Spine01"),
      spine02: find("Spine02"),
      rightArm: find("RightArm"),
      rightFore: find("RightForeArm"),
    };
  }, [cloned]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onImpactRef.current = onImpact;
    onBurstRef.current = onBurst;
  }, [onBurst, onComplete, onImpact]);

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
    clock.current = 0;
    beat.current = "";
    finished.current = false;
    impacted.current = false;
    snapped.current = false;
  }, [animation]);

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
    if (!snapped.current) {
      snapped.current = true;
      const edge = viewport.width / 2 + 0.55;
      start.current = { x: edge, y: 0.55 + viewport.height * 0.18 };
      away.current = { x: edge + 0.2, y: 0.7 + viewport.height * 0.28 };
    }
    clock.current += step;
    const t = clock.current;
    mixer.update(step);

    const play = (names: readonly string[], fade = 0.28, at?: number) => {
      const clip = findClip(registry, names);
      if (!clip) return;
      if (beat.current === clip.name) return;
      const next = actions.get(clip.name);
      if (!next) return;
      actions.forEach((action) => {
        if (action !== next) action.fadeOut(fade);
      });
      next.enabled = true;
      next.reset();
      next.setLoop(THREE.LoopRepeat, Infinity);
      next.fadeIn(fade).play();
      if (at !== undefined) next.time = at;
      current.current = next;
      beat.current = clip.name;
    };

    let thrust = 0;
    let x = 0;
    let y = 0;
    let tilt = 0;
    let squashX = 1;
    let squashY = 1;
    let wave = 0;
    let breathe = 1;
    let talk = animation === "talk" ? 1 : 0;

    if (animation === "arrive") {
      const flyEnd = 0.78;
      const bounceEnd = 1.22;
      const settleEnd = 1.5;
      const doneAt = 2.4;
      if (t < flyEnd) {
        const u = easeIn(t / flyEnd);
        play(CLIP_PREFERENCES.fly, 0.2, 0.42);
        x = start.current.x * (1 - u);
        y = start.current.y * (1 - u) + Math.sin(u * Math.PI) * 0.08;
        tilt = -0.45 * (1 - u);
        thrust = 1;
        breathe = 0;
      } else if (t < bounceEnd) {
        play(CLIP_PREFERENCES.land, 0.18);
        const u = clamp01((t - flyEnd) / (bounceEnd - flyEnd));
        const squash = Math.sin(u * Math.PI);
        squashX = 1 + squash * 0.22;
        squashY = 1 - squash * 0.32;
        y = Math.sin(u * Math.PI) * 0.16;
        if (!impacted.current) {
          impacted.current = true;
          onBurstRef.current();
          onImpactRef.current?.();
        }
      } else if (t < settleEnd) {
        play(CLIP_PREFERENCES.idle, 0.25);
        y = 0;
      } else {
        play(CLIP_PREFERENCES.idle, 0.2);
        if (t >= doneAt && !finished.current) {
          finished.current = true;
          onCompleteRef.current?.("arrive");
        }
      }
    } else if (animation === "depart") {
      const waveEnd = 0.9;
      const doneAt = 1.7;
      if (t < waveEnd) {
        const named = findClip(registry, CLIP_PREFERENCES.wave);
        if (named) play(CLIP_PREFERENCES.wave, 0.2);
        else play(CLIP_PREFERENCES.idle, 0.2);
        wave = named ? 0 : 0.62 + Math.sin((t / waveEnd) * Math.PI * 3) * 0.12;
        talk = 0.4;
      } else {
        const u = easeIn((t - waveEnd) / (doneAt - waveEnd));
        play(CLIP_PREFERENCES.depart, 0.18, 0.4);
        x = away.current.x * u;
        y = away.current.y * u;
        tilt = 0.4 * u;
        thrust = u;
        breathe = 0;
        if (t >= doneAt && !finished.current) {
          finished.current = true;
          onCompleteRef.current?.("depart");
        }
      }
    } else if (animation === "talk") {
      play(CLIP_PREFERENCES.talk, 0.3);
      y = Math.sin(t * 2.5) * 0.02;
    } else {
      play(CLIP_PREFERENCES.idle, 0.35);
      y = Math.sin(t * 1.6) * 0.012;
    }

    if (motion.current) {
      motion.current.position.set(x, y, 0);
      motion.current.rotation.set(tilt * 0.25, 0, tilt * 0.5);
    }
    const breathScale = 1 + Math.sin(clock.current * 1.7) * 0.015 * breathe;
    if (squash.current) {
      squash.current.scale.set(squashX, squashY * breathScale, squashX);
    }

    if (beat.current === "Idle") {
      for (const bone of [bones.head, bones.spine, bones.spine01, bones.spine02, bones.rightArm]) {
        if (bone && !bone.userData.rest) bone.userData.rest = bone.quaternion.clone();
      }
    }

    const restOf = (bone?: THREE.Bone) => bone?.userData.rest as THREE.Quaternion | undefined;
    const applyRest = (bone: THREE.Bone | undefined, xRot: number, yRot: number, zRot: number) => {
      const rest = restOf(bone);
      if (!bone || !rest) return;
      scratch.euler.set(xRot, yRot, zRot);
      scratch.q.setFromEuler(scratch.euler);
      bone.quaternion.copy(rest).multiply(scratch.q);
    };

    const look = (animation === "idle" ? 0.6 : 0) + talk;
    if (look > 0) {
      applyRest(
        bones.head,
        Math.sin(clock.current * 1.1) * 0.05 * look - pointer.current.y * 0.08,
        Math.sin(clock.current * 0.8) * 0.06 * look + pointer.current.x * 0.1,
        0,
      );
    }
    if (breathe > 0) {
      const breath = Math.sin(clock.current * 1.7) * 0.035 * breathe;
      applyRest(bones.spine02, breath, 0, 0);
      applyRest(bones.spine01, breath * 0.6, 0, 0);
      applyRest(bones.spine, breath * 0.3, 0, 0);
    }
    if (wave > 0.02) applyRest(bones.rightArm, 0, 0, -1.15 * wave);

    const jets = squash.current?.getObjectByName("airtime-jets");
    if (jets) {
      jets.visible = thrust > 0.04;
      jets.scale.setScalar(0.4 + thrust);
    }
  });

  return (
    <group ref={motion}>
      <group ref={squash}>
        <primitive object={cloned} position={[0, 0.02, 0]} />
        <group name="airtime-jets" position={[0, 0.05, -0.08]} visible={false}>
          <mesh position={[-0.08, 0, 0]}>
            <sphereGeometry args={[0.035, 10, 10]} />
            <meshBasicMaterial color={colors.accent} transparent opacity={0.9} />
          </mesh>
          <mesh position={[0.08, 0, 0]}>
            <sphereGeometry args={[0.035, 10, 10]} />
            <meshBasicMaterial color={colors.accent} transparent opacity={0.9} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export function knownGestures(clips: THREE.AnimationClip[]) {
  return listGestures(clips);
}

useGLTF.preload(AIRTIME_URL, false, true);
