import { ImageResponse } from "next/og";
import { connection } from "next/server";
import { getStore } from "@/lib/storage";
import { isDeliveryId } from "@/lib/storage/types";

export const alt = "A Payload delivery";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const delivery = isDeliveryId(id) ? await getStore().get(id) : null;
  return new ImageResponse(
    card({
      title: delivery ? `${delivery.senderName} sent you a Payload` : "A Payload is waiting",
      suit: delivery?.colors.suit ?? "#f4f7fb",
      accent: delivery?.colors.accent ?? "#5ce1ff",
    }),
    { ...size },
  );
}

export function card({ title, suit, accent }: { title: string; suit: string; accent: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#07060f",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flex: 1,
          padding: "72px",
          alignItems: "center",
          background: "radial-gradient(circle at 80% 20%, #3a2468 0%, #07060f 55%)",
        }}
      >
        <div style={{ display: "flex", width: 280, alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              display: "flex",
              width: 230,
              height: 230,
              borderRadius: 999,
              background: suit,
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                width: 156,
                height: 132,
                borderRadius: 999,
                background: "#0c0e14",
                marginTop: 12,
              }}
            />
            <div
              style={{
                position: "absolute",
                right: 18,
                top: 92,
                width: 28,
                height: 28,
                borderRadius: 999,
                background: accent,
              }}
            />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, marginLeft: 36 }}>
          <div style={{ fontSize: 22, letterSpacing: 6, color: "#b7f4ff", fontWeight: 700 }}>PAYLOAD</div>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05, marginTop: 18, maxWidth: 680 }}>{title}</div>
          <div style={{ marginTop: 28, fontSize: 28, color: "#d7deea" }}>Silent delivery. Open to watch them land.</div>
        </div>
      </div>
    </div>
  );
}
