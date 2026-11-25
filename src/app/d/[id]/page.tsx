import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { DeliveryExperience } from "@/components/delivery/delivery-experience";
import { getStore } from "@/lib/storage";
import { isDeliveryId, toPublic } from "@/lib/storage/types";

type Props = { params: Promise<{ id: string }> };

export const instant = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();
  const { id } = await params;
  const delivery = isDeliveryId(id) ? await getStore().get(id) : null;
  const title = delivery ? `${delivery.senderName} sent you a Payload` : "Payload drifted off";
  const description = delivery
    ? "A silent delivery is waiting. Open the link and watch them land."
    : "This delivery link doesn't go anywhere.";
  return {
    title: { absolute: title },
    description,
    openGraph: { title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function DeliveryPage({ params }: Props) {
  await connection();
  const { id } = await params;
  const delivery = isDeliveryId(id) ? await getStore().get(id) : null;
  if (!delivery) notFound();
  return <DeliveryExperience delivery={toPublic(delivery)} />;
}
