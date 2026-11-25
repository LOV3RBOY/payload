export const POSE_KEYS = [
  "x",
  "y",
  "z",
  "rx",
  "ry",
  "rz",
  "sx",
  "sy",
  "sz",
  "headX",
  "headY",
  "headZ",
  "armL",
  "armR",
  "armLX",
  "armRX",
  "legL",
  "legR",
] as const;

export type Pose = Record<(typeof POSE_KEYS)[number], number>;

export const REST: Pose = {
  x: 0,
  y: 0,
  z: 0,
  rx: 0,
  ry: 0,
  rz: 0,
  sx: 1,
  sy: 1,
  sz: 1,
  headX: 0,
  headY: 0,
  headZ: 0,
  armL: -0.22,
  armR: 0.22,
  armLX: 0.08,
  armRX: 0.08,
  legL: -0.04,
  legR: 0.06,
};

export type Sample = {
  pose: Pose;
  thrust: number;
  impact: boolean;
  done: boolean;
};

function clamp01(t: number) {
  return Math.min(1, Math.max(0, t));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const k = clamp01(t);
  const out = { ...a };
  for (const key of POSE_KEYS) out[key] = lerp(a[key], b[key], k);
  return out;
}

function easeIn(t: number) {
  return t * t * t;
}

function easeOut(t: number) {
  return 1 - (1 - t) ** 3;
}

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function flying(x: number, y: number, tilt = -0.62): Pose {
  return {
    ...REST,
    x,
    y,
    z: 0,
    rx: 0.35,
    rz: tilt,
    ry: 0.2,
    armL: -0.45,
    armR: 0.7,
    armLX: 1.05,
    armRX: -1.15,
    legL: -0.9,
    legR: 0.65,
  };
}

const IMPACT: Pose = {
  ...REST,
  y: 0,
  sx: 1.28,
  sy: 0.58,
  sz: 1.18,
  rx: 0.12,
  armL: -0.7,
  armR: 0.7,
  armLX: 0.45,
  armRX: 0.45,
  legL: 0.2,
  legR: 0.2,
};

const BOUNCE: Pose = {
  ...REST,
  y: 0.34,
  sx: 0.9,
  sy: 1.14,
  sz: 0.94,
  rx: -0.08,
  armL: -0.4,
  armR: 0.4,
};

export function sampleIdle(t: number): Sample {
  const pose = { ...REST };
  const bob = Math.sin(t * 1.7);
  pose.y = bob * 0.035;
  pose.sy = 1 + bob * 0.012;
  pose.sx = 1 - bob * 0.008;
  pose.ry = Math.sin(t * 0.45) * 0.18;
  pose.headZ = Math.sin(t * 0.8) * 0.04;
  pose.headY = Math.sin(t * 0.45) * 0.08;
  return { pose, thrust: 0, impact: false, done: false };
}

export function sampleTalk(t: number): Sample {
  const pose = { ...REST };
  const bob = Math.sin(t * 2.6);
  pose.y = bob * 0.04;
  pose.sy = 1 + bob * 0.02;
  pose.sx = 1 - bob * 0.012;
  pose.ry = Math.sin(t * 0.9) * 0.14;
  pose.headZ = Math.sin(t * 1.8) * 0.1;
  pose.headX = Math.sin(t * 2.3) * 0.07;
  pose.armR = 0.45 + Math.sin(t * 3.4) * 0.28;
  pose.armRX = -0.35 + Math.sin(t * 3.4) * 0.2;
  pose.armL = -0.28 + Math.sin(t * 2.4 + 1) * 0.1;
  pose.armLX = 0.15;
  return { pose, thrust: 0, impact: false, done: false };
}

export function sampleArrive(t: number, startX: number, startY: number): Sample {
  const flyEnd = 0.82;
  const impactEnd = 0.98;
  const bounceEnd = 1.28;
  const settleEnd = 1.55;
  const doneAt = 2.55;

  if (t < flyEnd) {
    const u = easeIn(t / flyEnd);
    const pose = lerpPose(flying(startX, startY), flying(0.02, 0.22, -0.2), u);
    return { pose, thrust: 1, impact: false, done: false };
  }
  if (t < impactEnd) {
    const u = easeOut((t - flyEnd) / (impactEnd - flyEnd));
    return {
      pose: lerpPose(flying(0.02, 0.22, -0.2), IMPACT, u),
      thrust: 1 - u,
      impact: true,
      done: false,
    };
  }
  if (t < bounceEnd) {
    const u = easeOut((t - impactEnd) / (bounceEnd - impactEnd));
    return { pose: lerpPose(IMPACT, BOUNCE, u), thrust: 0, impact: false, done: false };
  }
  if (t < settleEnd) {
    const u = easeInOut((t - bounceEnd) / (settleEnd - bounceEnd));
    return { pose: lerpPose(BOUNCE, REST, u), thrust: 0, impact: false, done: false };
  }

  const u = clamp01((t - settleEnd) / (doneAt - settleEnd));
  const wipe = Math.sin(u * Math.PI);
  const pose = { ...REST };
  pose.armR = lerp(REST.armR, 2.25, wipe);
  pose.armRX = lerp(REST.armRX, -0.95, wipe);
  pose.headZ = lerp(0, -0.14, wipe);
  pose.headX = lerp(0, 0.08, wipe);
  pose.ry = lerp(0, -0.12, wipe);
  return { pose, thrust: 0, impact: false, done: t >= doneAt };
}

export function sampleDepart(t: number, endX: number, endY: number): Sample {
  const waveEnd = 0.95;
  const doneAt = 1.85;
  if (t < waveEnd) {
    const wave = Math.sin((t / waveEnd) * Math.PI * 3.2);
    const pose = {
      ...REST,
      armR: 2.35 + wave * 0.22,
      armRX: -0.2,
      headZ: 0.1,
      ry: 0.2,
      y: Math.sin(t * 8) * 0.015,
    };
    return { pose, thrust: 0, impact: false, done: false };
  }
  const u = easeIn((t - waveEnd) / (doneAt - waveEnd));
  const lifted: Pose = { ...REST, y: 0.08, armR: 2.2, armRX: -0.2, ry: 0.15 };
  return {
    pose: lerpPose(lifted, flying(endX, endY, 0.55), u),
    thrust: u,
    impact: false,
    done: t >= doneAt,
  };
}
