"use client";

import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";

function BoltIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z" fill="#22C55E" />
    </svg>
  );
}

const VALUE = [
  { left: "Your Script", right: "paste it, own it" },
  { left: "Upload CSV", right: "auto-queue leads" },
  { left: "Power Dial", right: "one tap, next call" },
  { left: "$39/mo", right: "cancel anytime" },
];

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="absolute right-4 top-4">
        <SignedOut>
          <Link href="/sign-in" className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200">
            Sign in
          </Link>
        </SignedOut>
        <SignedIn>
          <Link href="/dashboard" className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200">
            Dashboard
          </Link>
        </SignedIn>
      </div>

      <div className="animate-pulse-glow absolute h-52 w-52 rounded-full bg-[#22C55E]/10 blur-3xl" />

      <div className="animate-fade-in-up relative z-10 flex flex-col items-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg shadow-[#22C55E]/20 dark:bg-[#1C1C1C]">
          <BoltIcon size={32} />
        </div>

        <h1 className="mb-1.5 text-4xl font-black tracking-tight text-zinc-900 dark:text-white">
          SkipDial
        </h1>
        <p className="mb-10 text-sm font-medium tracking-wide text-zinc-400 dark:text-zinc-500">
          Stop dialing. Start closing.
        </p>

        <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] px-6 py-5 shadow-sm">
          {VALUE.map((v, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <span className="font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {v.left}
              </span>
              <span className="flex items-center gap-2 font-mono text-xs text-zinc-400 dark:text-zinc-500">
                <span className="text-[#22C55E]">&rarr;</span> {v.right}
              </span>
            </div>
          ))}
        </div>

        <SignedOut>
          <Link href="/sign-up" className="mt-8 flex items-center gap-2 rounded-xl bg-[#22C55E] px-8 py-3 text-sm font-semibold text-white shadow-sm shadow-[#22C55E]/25 transition-all hover:bg-[#16A34A] hover:shadow-md hover:shadow-[#22C55E]/30 active:scale-[0.98]">
            Start for free
          </Link>
        </SignedOut>
        <SignedIn>
          <Link href="/dashboard" className="mt-8 flex items-center gap-2 rounded-xl bg-[#22C55E] px-8 py-3 text-sm font-semibold text-white shadow-sm shadow-[#22C55E]/25 transition-all hover:bg-[#16A34A] hover:shadow-md hover:shadow-[#22C55E]/30 active:scale-[0.98]">
            Go to Dashboard
          </Link>
        </SignedIn>

        <p className="mt-6 font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
          <SignedOut>
            <Link href="/sign-in" className="underline-offset-4 transition-colors hover:text-zinc-600 hover:underline dark:hover:text-zinc-300">
              Sign in
            </Link>
            <span className="mx-2">&middot;</span>
          </SignedOut>
          $39/mo solo &middot; $29/seat team
        </p>
      </div>

      <p className="absolute bottom-4 font-mono text-[10px] text-zinc-300 dark:text-zinc-600">
        &copy; {new Date().getFullYear()} SkipDial
      </p>
    </div>
  );
}
