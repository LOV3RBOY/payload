"use client";

import { useGLTF } from "@react-three/drei";
import dynamic from "next/dynamic";
import { AIRTIME_URL } from "@/components/astronaut/airtime";
import type { AstronautCanvasProps } from "@/components/astronaut/types";

useGLTF.preload(AIRTIME_URL, false, true);

const AstronautCanvas = dynamic(
  () => import("@/components/astronaut/astronaut-canvas").then((mod) => mod.AstronautCanvas),
  { ssr: false },
);

export function AstronautStage(props: AstronautCanvasProps) {
  return <AstronautCanvas {...props} />;
}
