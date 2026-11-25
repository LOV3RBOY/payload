import Link from "next/link";
import { SpaceBackdrop } from "@/components/space/space-backdrop";

export default function MissingDelivery() {
  return (
    <div className="relative min-h-dvh text-white">
      <SpaceBackdrop />
      <div className="relative z-10 mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-6 text-center">
        <p className="font-speech text-3xl font-extrabold">This one drifted off.</p>
        <p className="mt-3 text-sm text-white/70">The link doesn&apos;t match a delivery. Send a new one instead.</p>
        <Link href="/" className="mt-6 inline-flex h-12 items-center rounded-full bg-[#5ce1ff] px-6 font-semibold text-slate-950">
          Make your own
        </Link>
      </div>
    </div>
  );
}
