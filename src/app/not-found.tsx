import Link from "next/link";
import { SpaceBackdrop } from "@/components/space/space-backdrop";

export default function NotFound() {
  return (
    <div className="relative min-h-dvh text-white">
      <SpaceBackdrop />
      <div className="relative z-10 mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-6 text-center">
        <p className="font-speech text-3xl font-extrabold">Lost in the dark.</p>
        <p className="mt-3 text-sm text-white/70">That page isn&apos;t on the flight plan.</p>
        <Link href="/" className="mt-6 inline-flex h-12 items-center rounded-full bg-[#5ce1ff] px-6 font-semibold text-slate-950">
          Back to launch
        </Link>
      </div>
    </div>
  );
}
