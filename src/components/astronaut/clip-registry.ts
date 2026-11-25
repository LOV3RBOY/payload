import type { AnimationClip } from "three";

/**
 * Courier states play these Mixamo clips by name.
 * Arrive is FlyIn, then Land, then DustOff.
 * Talk loops while a bubble is typing, then Idle.
 * Depart is Wave, then FlyOff.
 * Gesture tags ([wave], [shrug], …) play the matching clip once.
 * Every clip in the GLB is also indexed by `buildClipRegistry`.
 */
export const CLIP_PREFERENCES = {
  idle: ["Idle"],
  talk: ["Talk", "Idle"],
  arrive: ["FlyIn", "Land", "DustOff"],
  depart: ["Wave", "FlyOff"],
  gestures: ["Wave", "Shrug", "Celebrate", "Think", "Facepalm", "Bow", "Dance", "Sad", "Laugh", "Point"],
} as const;

export type CourierBeat = keyof typeof CLIP_PREFERENCES;

export function buildClipRegistry(clips: AnimationClip[]) {
  const registry = new Map<string, AnimationClip>();
  for (const clip of clips) {
    registry.set(clip.name, clip);
    registry.set(clip.name.toLowerCase(), clip);
  }
  return registry;
}

export function listGestures(clips: AnimationClip[]) {
  return clips.map((clip) => clip.name);
}

export function findClip(registry: Map<string, AnimationClip>, names: readonly string[]) {
  for (const name of names) {
    const clip = registry.get(name) ?? registry.get(name.toLowerCase());
    if (clip) return clip;
  }
  return undefined;
}
