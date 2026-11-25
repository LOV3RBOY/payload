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
  gesture?: string | null;
  gestureToken?: number;
  onComplete?: (animation: AstronautAnimation) => void;
  onImpact?: () => void;
  onGestureEnd?: () => void;
  className?: string;
};
