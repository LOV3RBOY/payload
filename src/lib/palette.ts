export const SUITS = [
  { id: "lunar", label: "Lunar", hex: "#f4f7fb" },
  { id: "coral", label: "Coral", hex: "#f09595" },
  { id: "mint", label: "Mint", hex: "#9fe0cf" },
  { id: "lilac", label: "Lilac", hex: "#cbb6f0" },
  { id: "midnight", label: "Midnight", hex: "#1c1e26" },
  { id: "gold", label: "Gold", hex: "#e3c27a" },
] as const;

export const VISORS = [
  { id: "eclipse", label: "Eclipse", hex: "#12141c" },
  { id: "ice", label: "Ice", hex: "#16343e" },
  { id: "rose", label: "Rose", hex: "#3a1c28" },
  { id: "gold", label: "Gold", hex: "#3a3218" },
  { id: "violet", label: "Violet", hex: "#2a1844" },
  { id: "amber", label: "Amber", hex: "#3a2412" },
] as const;

export const ACCENTS = [
  { id: "signal", label: "Signal", hex: "#5ce1ff" },
  { id: "gold", label: "Gold", hex: "#f0c85a" },
  { id: "coral", label: "Coral", hex: "#ff8d7a" },
  { id: "mint", label: "Mint", hex: "#7dffe0" },
  { id: "violet", label: "Violet", hex: "#c9a6ff" },
  { id: "white", label: "White", hex: "#ffffff" },
] as const;

export const DEFAULT_COLORS = {
  suit: SUITS[0].hex,
  visor: VISORS[0].hex,
  accent: ACCENTS[0].hex,
};

const HEX = /^#([0-9a-f]{6})$/i;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value);
}

export function parseHex(hex: string): { r: number; g: number; b: number } {
  const n = Number.parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function toHex(r: number, g: number, b: number): string {
  const channel = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

export function shadeHex(hex: string, amount: number): string {
  const { r, g, b } = parseHex(hex);
  const target = amount < 0 ? 0 : 255;
  const p = Math.min(1, Math.abs(amount));
  const mix = (c: number) => c + (target - c) * p;
  return toHex(mix(r), mix(g), mix(b));
}

/** Keep visor colors in tinted-glass range so a bright hex still reads as a visor. */
export function toVisorGlass(hex: string): string {
  const { r, g, b } = parseHex(hex);
  const max = Math.max(r, g, b);
  if (max <= 90) return hex;
  const scale = 90 / max;
  return toHex(r * scale, g * scale, b * scale);
}
