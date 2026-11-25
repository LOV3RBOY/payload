import type { AnimationClip } from "three";

/**
 * Courier states ask for clips by these names, in order.
 * A new clip in the GLB is registered automatically under its own name.
 * Drop in Wave, Land, Talk, Fly, Shrug, Dance, and so on, and the
 * matching state will prefer it. Anything else is still addressable
 * through `listGestures` for a later LLM gesture pick.
 */
export const CLIP_PREFERENCES = {
  idle: ["Idle"],
  talk: ["Talk", "Idle"],
  fly: ["Fly", "Jump", "Run"],
  land: ["Land", "Idle"],
  wave: ["Wave"],
  depart: ["Fly", "Jump", "Run"],
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
