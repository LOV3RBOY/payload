"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Check, Copy } from "lucide-react";
import { AstronautStage } from "@/components/astronaut/astronaut-stage";
import { SpaceBackdrop } from "@/components/space/space-backdrop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MAX_MESSAGE, MAX_NAME } from "@/lib/limits";
import { ACCENTS, SUITS, VISORS } from "@/lib/palette";
import { PERSONALITY_OPTIONS, type Personality } from "@/lib/personalities";
import { cn } from "@/lib/utils";

export function Composer() {
  const [suit, setSuit] = useState<string>(SUITS[0].hex);
  const [visor, setVisor] = useState<string>(VISORS[0].hex);
  const [accent, setAccent] = useState<string>(ACCENTS[0].hex);
  const [personality, setPersonality] = useState<Personality>("deadpan");
  const [senderName, setSenderName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const colors = useMemo(() => ({ suit, visor, accent }), [accent, suit, visor]);

  async function launch(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName,
          message,
          personality,
          colors,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        setError(data.error || "Launch fizzled. Try again.");
        return;
      }
      setLink(`${window.location.origin}${data.url}`);
      setCopied(false);
    } catch {
      setError("Launch fizzled. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
      setError("Copy didn't stick. Select the link instead.");
    }
  }

  return (
    <div className="relative min-h-dvh text-white">
      <SpaceBackdrop />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-6 px-5 py-6 lg:flex-row lg:items-center lg:gap-12 lg:px-10">
        <section className="relative h-[46vh] min-h-[300px] lg:sticky lg:top-6 lg:h-[82vh] lg:min-h-[520px] lg:w-[46%]">
          <AstronautStage colors={colors} animation="idle" frame="stage" />
          <div className="pointer-events-none absolute inset-x-[18%] bottom-[10%] h-10 rounded-full bg-cyan-300/25 blur-2xl" />
        </section>

        <section className="flex-1 pb-8 lg:max-w-xl">
          <p className="text-xs font-semibold tracking-[0.28em] text-cyan-200/80">PAYLOAD</p>
          <h1 className="mt-3 font-speech text-4xl leading-none font-extrabold tracking-tight sm:text-5xl">
            Send a tiny astronaut.
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-white/70">
            They land on your friend&apos;s screen, deliver the message in character, and leave when dismissed. No account. No install. Silent unless they turn sound on.
          </p>

          {link ? (
            <div className="rise-in mt-8 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
              <p className="text-xs font-semibold tracking-[0.18em] text-cyan-100/80">IN FLIGHT</p>
              <h2 className="mt-2 font-speech text-2xl font-extrabold">They&apos;re packed.</h2>
              <p className="mt-2 text-sm text-white/70">Send this link. The landing plays the moment it opens.</p>
              <div className="mt-4 flex gap-2">
                <Input readOnly value={link} aria-label="Share link" className="h-12 rounded-full border-white/15 bg-black/30 px-4 text-white" />
                <Button
                  type="button"
                  onClick={copy}
                  className="h-12 rounded-full bg-[#5ce1ff] px-4 font-semibold text-slate-950 hover:bg-[#9aefff]"
                >
                  {copied ? <Check /> : <Copy />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <a href={link} className="text-cyan-100 underline-offset-4 hover:underline">
                  Preview the landing
                </a>
                <button
                  type="button"
                  className="text-white/70 underline-offset-4 hover:text-white hover:underline"
                  onClick={() => {
                    setLink("");
                    setMessage("");
                    setError("");
                  }}
                >
                  Send another
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={launch} className="mt-8 space-y-5">
              <Swatches label="Suit" options={SUITS} value={suit} onChange={setSuit} />
              <Swatches label="Visor" options={VISORS} value={visor} onChange={setVisor} />
              <Swatches label="Accent" options={ACCENTS} value={accent} onChange={setAccent} />

              <fieldset>
                <legend className="text-sm font-medium text-white/80">Personality</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {PERSONALITY_OPTIONS.map((option) => {
                    const selected = personality === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setPersonality(option.id)}
                        className={cn(
                          "rounded-2xl border px-3 py-3 text-left transition",
                          selected
                            ? "border-cyan-200/80 bg-cyan-300/15"
                            : "border-white/10 bg-white/5 hover:bg-white/10",
                        )}
                      >
                        <span className="block text-sm font-semibold">{option.label}</span>
                        <span className="mt-1 block text-xs leading-snug text-white/60">{option.blurb}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <label className="block">
                <span className="text-sm font-medium text-white/80">Your name</span>
                <Input
                  value={senderName}
                  maxLength={MAX_NAME}
                  onChange={(event) => setSenderName(event.target.value)}
                  placeholder="Chad"
                  autoComplete="name"
                  className="mt-2 h-12 rounded-2xl border-white/15 bg-white/5 px-4 text-base text-white placeholder:text-white/35"
                />
              </label>

              <label className="block">
                <span className="flex items-center justify-between text-sm font-medium text-white/80">
                  Message
                  <span className="text-xs font-normal text-white/45">
                    {message.length}/{MAX_MESSAGE}
                  </span>
                </span>
                <Textarea
                  value={message}
                  maxLength={MAX_MESSAGE}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Tacos Friday at 7? Say yes or I keep dancing."
                  rows={4}
                  className="mt-2 min-h-28 rounded-2xl border-white/15 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/35"
                />
              </label>

              {error ? <p className="text-sm text-rose-200">{error}</p> : null}

              <Button
                type="submit"
                disabled={pending}
                className="h-12 w-full rounded-full bg-[#5ce1ff] text-base font-semibold text-slate-950 hover:bg-[#9aefff]"
              >
                {pending ? "Launching…" : "Launch"}
              </Button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

function Swatches({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { id: string; label: string; hex: string }[];
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-white/80">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value.toLowerCase() === option.hex.toLowerCase();
          return (
            <button
              key={option.id}
              type="button"
              aria-label={`${label}: ${option.label}`}
              aria-pressed={selected}
              onClick={() => onChange(option.hex)}
              className={cn(
                "size-11 rounded-full ring-2 ring-offset-2 ring-offset-[#07060f] transition",
                selected ? "ring-white" : "ring-transparent hover:ring-white/40",
              )}
              style={{
                background: option.hex,
                boxShadow: option.hex.toLowerCase() === "#1c1e26" ? "inset 0 0 0 1px rgba(255,255,255,0.25)" : undefined,
              }}
            />
          );
        })}
      </div>
    </fieldset>
  );
}
