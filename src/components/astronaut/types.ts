export type AstronautAnimation = "idle" | "arrive" | "talk" | "depart";

export type AstronautColors = {
  suit: string;
  visor: string;
  accent: string;
};

export type AstronautFrame = "hero" | "stage";

export type AstronautCanvasProps = {
  colors: AstronautColors;
  animation: AstronautAnimation;
  frame?: AstronautFrame;
  onComplete?: (animation: AstronautAnimation) => void;
  onImpact?: () => void;
  className?: string;
};
