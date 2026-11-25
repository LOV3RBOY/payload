import { ImageResponse } from "next/og";
import { card, size, contentType } from "./d/[id]/opengraph-image";

export const alt = "Payload";
export { size, contentType };

export default function Image() {
  return new ImageResponse(
    card({
      title: "Send a tiny astronaut.",
      suit: "#f4f7fb",
      accent: "#5ce1ff",
    }),
    { ...size },
  );
}
