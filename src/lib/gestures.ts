export const GESTURE_NAMES = [
  "wave",
  "shrug",
  "celebrate",
  "think",
  "facepalm",
  "bow",
  "dance",
  "sad",
  "laugh",
  "point",
] as const;

export type GestureName = (typeof GESTURE_NAMES)[number];

const CLIP_BY_GESTURE: Record<GestureName, string> = {
  wave: "Wave",
  shrug: "Shrug",
  celebrate: "Celebrate",
  think: "Think",
  facepalm: "Facepalm",
  bow: "Bow",
  dance: "Dance",
  sad: "Sad",
  laugh: "Laugh",
  point: "Point",
};

export function isGestureName(value: string): value is GestureName {
  return (GESTURE_NAMES as readonly string[]).includes(value);
}

export function clipForGesture(name: string) {
  const key = name.toLowerCase();
  return isGestureName(key) ? CLIP_BY_GESTURE[key] : undefined;
}

export function readGesture(raw: string): {
  gesture: GestureName | null;
  speech: string;
  pending: boolean;
} {
  const trimmed = raw.trimStart();
  if (!trimmed.startsWith("[")) {
    return { gesture: null, speech: raw.trim(), pending: false };
  }
  const end = trimmed.indexOf("]");
  if (end === -1) {
    return { gesture: null, speech: "", pending: trimmed.length < 16 };
  }
  if (end > 14) {
    return { gesture: null, speech: trimmed, pending: false };
  }
  const name = trimmed.slice(1, end).toLowerCase();
  const speech = trimmed.slice(end + 1).trim();
  if (isGestureName(name)) {
    return { gesture: name, speech, pending: false };
  }
  return { gesture: null, speech: trimmed, pending: false };
}

export function speechWithoutGesture(raw: string) {
  return readGesture(raw).speech;
}
