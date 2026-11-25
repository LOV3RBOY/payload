"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { AstronautStage } from "@/components/astronaut/astronaut-stage";
import type { AstronautAnimation } from "@/components/astronaut/types";
import { SpeechBubble } from "@/components/delivery/speech-bubble";
import { playThud, playWhoosh, SoundToggle, useSoundEnabled } from "@/components/sound-toggle";
import { SpaceBackdrop } from "@/components/space/space-backdrop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_CHAT } from "@/lib/limits";
import { readGesture } from "@/lib/gestures";
import { introLine } from "@/lib/personalities";
import type { PublicDelivery } from "@/lib/storage/types";

type Phase = "arriving" | "speaking" | "chatting" | "leaving" | "gone";

function subscribeReduced(onChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function readReduced() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function DeliveryExperience({ delivery }: { delivery: PublicDelivery }) {
  const [phase, setPhase] = useState<Phase>("arriving");
  const reduced = useSyncExternalStore(subscribeReduced, readReduced, () => false);
  const [turns, setTurns] = useState(delivery.replies);
  const [draft, setDraft] = useState("");
  const [live, setLive] = useState("");
  const [busy, setBusy] = useState(false);
  const [chatError, setChatError] = useState("");
  const [scriptDone, setScriptDone] = useState(false);
  const [gesture, setGesture] = useState<{ name: string; id: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const whooshed = useRef(false);
  const tagged = useRef(false);
  const sound = useSoundEnabled();
  const script = useMemo(
    () => `${introLine(delivery.senderName, delivery.personality)}\n${delivery.message}`,
    [delivery.message, delivery.personality, delivery.senderName],
  );

  useEffect(() => {
    if (!sound.enabled || phase !== "arriving" || whooshed.current) return;
    whooshed.current = true;
    playWhoosh();
  }, [phase, sound.enabled]);

  useEffect(() => {
    if (phase === "chatting") inputRef.current?.focus();
  }, [phase]);

  const view: Phase = reduced && phase === "arriving" ? "speaking" : phase;
  const typingIntro = view === "speaking" && !scriptDone;
  const typingReply = view === "chatting" && busy;
  const animation: AstronautAnimation =
    view === "arriving"
      ? "arrive"
      : view === "leaving" || view === "gone"
        ? "depart"
        : typingIntro || typingReply
          ? "talk"
          : "idle";

  const showAstronaut = view !== "gone";
  const showBubble = view === "speaking" || view === "chatting";
  const showActions = view === "speaking" || view === "chatting";
  const bubbleText = view === "chatting" && (live || busy) ? live || "…" : script;

  async function sendReply(event: FormEvent) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || busy) return;
    setBusy(true);
    setChatError("");
    setDraft("");
    setLive("");
    setGesture(null);
    tagged.current = false;
    setTurns((current) => [...current, { role: "user", content: message, at: new Date().toISOString() }]);
    try {
      const response = await fetch(`/api/deliveries/${delivery.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { reply?: string; error?: string };
        const raw = data.reply || data.error || "The signal fuzzed out. Try that again.";
        const parsed = readGesture(raw);
        const reply = parsed.speech || raw;
        if (parsed.gesture) setGesture({ name: parsed.gesture, id: Date.now() });
        setLive(reply);
        setTurns((current) => [...current, { role: "assistant", content: reply, at: new Date().toISOString() }]);
        return;
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("empty");
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const step = await reader.read();
        if (step.done) break;
        full += decoder.decode(step.value, { stream: true });
        const parsed = readGesture(full);
        if (parsed.pending) continue;
        if (parsed.gesture && !tagged.current) {
          tagged.current = true;
          setGesture({ name: parsed.gesture, id: Date.now() });
        }
        setLive(parsed.speech);
      }
      full += decoder.decode();
      const parsed = readGesture(full.trim());
      const reply = parsed.speech || "Copy that.";
      if (parsed.gesture && !tagged.current) setGesture({ name: parsed.gesture, id: Date.now() });
      setLive(reply);
      setTurns((current) => [...current, { role: "assistant", content: reply, at: new Date().toISOString() }]);
    } catch {
      const reply = "The signal fuzzed out. Try that again.";
      setChatError(reply);
      setLive(reply);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-dvh text-white">
      <SpaceBackdrop />
      <p className="sr-only">
        Silent delivery from {delivery.senderName}. {script}
      </p>
      {showAstronaut ? (
        <div className="pointer-events-none fixed inset-0 z-[1]">
          <AstronautStage
            colors={delivery.colors}
            animation={animation}
            frame="hero"
            gesture={gesture?.name ?? null}
            gestureToken={gesture?.id ?? 0}
            onGestureEnd={() => setGesture(null)}
            onImpact={() => {
              if (sound.enabled) playThud();
            }}
            onComplete={(done) => {
              if (done === "arrive") setPhase("speaking");
              if (done === "depart") setPhase("gone");
            }}
          />
        </div>
      ) : null}

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <header className="flex items-start justify-between gap-3">
          {showActions ? (
            <div className="rise-in rounded-full bg-sky-300/10 px-3 py-1 text-xs font-semibold tracking-wide text-sky-100 ring-1 ring-sky-200/20">
              Silent delivery
            </div>
          ) : (
            <div />
          )}
          <SoundToggle enabled={sound.enabled} onToggle={sound.toggle} />
        </header>

        <div className="flex flex-1 flex-col items-center justify-start pt-3">
          {phase === "gone" ? (
            <div className="rise-in mt-[18vh] max-w-xs text-center">
              <p className="font-speech text-3xl font-extrabold">They waved and left.</p>
              <p className="mt-3 text-sm text-white/70">The message landed. The helmet did not stay for questions.</p>
            </div>
          ) : null}

          {showBubble ? (
            <div className="w-full" aria-hidden>
              <SpeechBubble
                text={bubbleText}
                animate={view === "speaking" && !reduced}
                onDone={view === "speaking" ? () => setScriptDone(true) : undefined}
              />
            </div>
          ) : null}

          {phase === "chatting" ? (
            <div className="mt-3 flex w-full flex-col items-end gap-2">
              {turns
                .filter((turn) => turn.role === "user")
                .slice(-3)
                .map((turn, index) => (
                  <p
                    key={`${turn.at}-${index}`}
                    className="max-w-[85%] rounded-full bg-[#120d1c] px-3 py-1.5 text-sm text-white ring-1 ring-white/15"
                  >
                    {turn.content}
                  </p>
                ))}
            </div>
          ) : null}
        </div>

        {showActions ? (
          <footer className="rise-in">
            {phase === "chatting" ? (
              <form onSubmit={sendReply}>
                <div className="flex items-center gap-2">
                  <Input
                    ref={inputRef}
                    value={draft}
                    maxLength={MAX_CHAT}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Talk back"
                    aria-label="Reply to the astronaut"
                    className="h-12 rounded-full border-white/15 bg-white/10 px-4 text-base text-white placeholder:text-white/45"
                  />
                  <Button
                    type="submit"
                    disabled={busy || !draft.trim()}
                    className="h-12 rounded-full bg-[#5ce1ff] px-5 font-semibold text-slate-950 hover:bg-[#9aefff]"
                  >
                    {busy ? "…" : "Send"}
                  </Button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Link
                    href="/"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 bg-white/5 text-sm text-white"
                  >
                    Make your own
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => (reduced ? setPhase("gone") : setPhase("leaving"))}
                    className="h-12 rounded-full border-white/15 bg-white/5 text-base text-white hover:bg-white/10 hover:text-white"
                  >
                    Hide
                  </Button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPhase("chatting")}
                  className="h-12 rounded-full border-white/15 bg-white/5 text-base text-white hover:bg-white/10 hover:text-white"
                >
                  Reply
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (reduced) setPhase("gone");
                    else setPhase("leaving");
                  }}
                  className="h-12 rounded-full border-white/15 bg-white/5 text-base text-white hover:bg-white/10 hover:text-white"
                >
                  Hide
                </Button>
              </div>
            )}
            {chatError ? <p className="mt-2 text-center text-xs text-white/60">{chatError}</p> : null}
            {phase === "speaking" ? (
              <div className="mt-3 text-center text-sm">
                <Link href="/" className="text-white/75 underline-offset-4 hover:text-white hover:underline">
                  Make your own
                </Link>
              </div>
            ) : null}
          </footer>
        ) : null}

        {phase === "gone" ? (
          <div className="pb-2 text-center">
            <Button
              nativeButton={false}
              render={<Link href="/" />}
              className="h-12 rounded-full bg-[#5ce1ff] px-6 font-semibold text-slate-950 hover:bg-[#9aefff]"
            >
              Make your own
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
