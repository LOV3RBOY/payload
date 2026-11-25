import type { Metadata } from "next";
import { Composer } from "@/components/send/composer";

export const metadata: Metadata = {
  title: "Send a Payload",
  description: "Pick a suit, a personality, and a message. A tiny astronaut delivers it.",
};

export default function HomePage() {
  return <Composer />;
}
