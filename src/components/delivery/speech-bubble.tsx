"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function useTypewriter(text: string, active: boolean, speed = 16) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      setCount((current) => (current >= text.length ? current : current + 1));
    }, speed);
    return () => window.clearInterval(id);
  }, [active, speed, text]);

  if (!active) {
    return { shown: text, done: true, skip: () => undefined };
  }
  return {
    shown: text.slice(0, count),
    done: count >= text.length,
    skip: () => setCount(text.length),
  };
}

export function SpeechBubble({
  text,
  animate = true,
  className,
}: {
  text: string;
  animate?: boolean;
  className?: string;
}) {
  const typed = useTypewriter(text, animate, 16);
  const typing = animate && !typed.done;

  return (
    <button
      type="button"
      onClick={typed.skip}
      className={cn(
        "bubble-in relative mx-auto block w-full max-w-[340px] cursor-pointer rounded-[28px] border-0 bg-white px-6 py-5 text-center font-speech text-[17px] leading-snug font-bold text-neutral-900 shadow-[0_18px_50px_rgba(0,0,0,0.35)]",
        className,
      )}
    >
      <span className="whitespace-pre-wrap">
        {typed.shown}
        {typing ? <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] bg-neutral-900 align-middle" /> : null}
      </span>
      <span aria-hidden className="absolute -bottom-[7px] left-12 size-4 rotate-45 rounded-[3px] bg-white" />
    </button>
  );
}
