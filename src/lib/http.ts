import { NextResponse } from "next/server";
import { MAX_BODY_BYTES, MAX_CHAT_TURNS, MAX_CREATES_PER_HOUR } from "@/lib/limits";
import { createReplyStream, llmConfigured } from "@/lib/llm/adapter";
import { limitLine } from "@/lib/personalities";
import { allowChat, allowCreate, clientIp, parseChatInput, parseCreateInput } from "@/lib/safety";
import { getStore } from "@/lib/storage";
import { isDeliveryId, toPublic } from "@/lib/storage/types";

export async function readJson(request: Request): Promise<unknown> {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    throw new PayloadError(413, "That was too long to launch.");
  }
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new PayloadError(400, "That request wasn't readable.");
  }
}

export class PayloadError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof PayloadError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[payload] request failed");
  return NextResponse.json({ error: "Something glitched. Try again." }, { status: 500 });
}

export async function createDelivery(request: Request) {
  if (!allowCreate(clientIp(request))) {
    return NextResponse.json(
      { error: `Easy. ${MAX_CREATES_PER_HOUR} launches an hour is plenty.` },
      { status: 429 },
    );
  }
  const parsed = parseCreateInput(await readJson(request));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const delivery = await getStore().create(parsed.value);
  return NextResponse.json({ id: delivery.id, url: `/d/${delivery.id}` });
}

export async function readDelivery(id: string) {
  if (!isDeliveryId(id)) {
    return NextResponse.json({ error: "This payload drifted off." }, { status: 404 });
  }
  const delivery = await getStore().get(id);
  if (!delivery) {
    return NextResponse.json({ error: "This payload drifted off." }, { status: 404 });
  }
  return NextResponse.json(toPublic(delivery), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function chatWithDelivery(request: Request, id: string) {
  if (!isDeliveryId(id)) {
    return NextResponse.json({ error: "This payload drifted off." }, { status: 404 });
  }
  if (!allowChat(clientIp(request))) {
    return NextResponse.json(
      { error: "The radio is warm. Give it a second.", reply: "The radio is warm. Give it a second." },
      { status: 429 },
    );
  }
  const parsed = parseChatInput(await readJson(request));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const existing = await getStore().get(id);
  if (!existing) {
    return NextResponse.json({ error: "This payload drifted off." }, { status: 404 });
  }
  if (existing.chatCount >= MAX_CHAT_TURNS) {
    const reply = limitLine(existing.personality);
    return NextResponse.json({ error: "limit", reply }, { status: 429 });
  }

  const turn = await getStore().addUserTurn(id, parsed.message);
  if (!turn.ok) {
    if (turn.reason === "missing") {
      return NextResponse.json({ error: "This payload drifted off." }, { status: 404 });
    }
    const reply = limitLine(turn.delivery.personality);
    return NextResponse.json({ error: "limit", reply }, { status: 429 });
  }

  const stream = createReplyStream(turn.delivery, parsed.message);
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Payload-Voice": llmConfigured() ? "portal" : "canned",
    },
  });
}
