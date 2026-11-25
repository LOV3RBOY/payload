"use client";

import dynamic from "next/dynamic";
import type { AstronautCanvasProps } from "@/components/astronaut/types";

const AstronautCanvas = dynamic(
  () => import("@/components/astronaut/astronaut-canvas").then((mod) => mod.AstronautCanvas),
  { ssr: false },
);

export function AstronautStage(props: AstronautCanvasProps) {
  return <AstronautCanvas {...props} />;
}
