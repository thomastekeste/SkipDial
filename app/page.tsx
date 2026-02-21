import Link from "next/link";

function BoltIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z" fill="#22C55E" />
    </svg>
  );
}

function CheckCircle() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

const VALUE = [
  { left: "Your Script", right: "paste it, own it" },
  { left: "Upload CSV", right: "auto-queue leads" },
  { left: "Power Dial", right: "one tap, next call" },
  { left: "$39/mo", right: "cancel anytime" },
];

const COMPETITORS = [
  { name: "SkipDial", price: "$39/mo", highlight: true },
  { name: "Mojo", price: "$99/mo", highlight: false },
  { name: "PhoneBurner", price: "$149/mo", highlight: false },
  { name: "Ringy", price: "$109/mo", highlight: false },
];

const FAQ = [
  {
    q: "Do I need a special phone number?",
    a: "No. SkipDial uses your personal phone line via the built-in dialer. No VoIP, no extra numbers, no setup.",
  },
  {
    q: "What CSV format do you support?",
    a: "Any CSV with NAME and PHONE columns. DOB and STATE are optional but unlock age display and timezone-smart sorting.",
  },
  {
    q: "Can I use my own script?",
    a: "Absolutely. Paste your full script or build it in sections. Use {firstName}, {dob}, and {state} placeholders that auto-fill per lead.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. No contracts, no setup fees. Cancel from your dashboard in one click and you won't be charged again.",
  },
];

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center bg-[var(--background)]">
      {/* ── Nav ── */}
      <div className="absolute right-4 top-4 z-10 flex items-center gap-4">
        <Link
          href="/sign-in"
          className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200"
        >
          Sign in
        </Link>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200"
        >
          Dashboard
        </Link>
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* HERO */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <section className="relative flex w-full flex-col items-center justify-center px-4 pt-24 pb-20">
        <div className="animate-pulse-glow absolute h-52 w-52 rounded-full bg-[#22C55E]/10 blur-3xl" />

        <div className="animate-fade-in-up relative z-10 flex flex-col items-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg shadow-[#22C55E]/20 dark:bg-[#1C1C1C]">
            <BoltIcon size={32} />
          </div>

          <h1 className="mb-1.5 text-4xl font-black tracking-tight text-zinc-900 dark:text-white">SkipDial</h1>
          <p className="mb-10 text-sm font-medium tracking-wide text-zinc-400 dark:text-zinc-500">
            Stop dialing. Start closing.
          </p>

          <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] px-6 py-5 shadow-sm">
            {VALUE.map((v, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <span className="font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-300">{v.left}</span>
                <span className="flex items-center gap-2 font-mono text-xs text-zinc-400 dark:text-zinc-500">
                  <span className="text-[#22C55E]">&rarr;</span> {v.right}
                </span>
              </div>
            ))}
          </div>

          <Link
            href="/sign-up"
            className="mt-8 flex items-center gap-2 rounded-xl bg-[#22C55E] px-8 py-3 text-sm font-semibold text-white shadow-sm shadow-[#22C55E]/25 transition-all hover:bg-[#16A34A] hover:shadow-md hover:shadow-[#22C55E]/30 active:scale-[0.98]"
          >
            Start for free
          </Link>

          <p className="mt-6 font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
            $39/mo solo &middot; $29/seat team
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* DEMO PLACEHOLDER */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <section className="w-full px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">See it in action</h2>
          <p className="mb-8 text-sm text-zinc-400 dark:text-zinc-500">
            Upload, dial, close — all in under 60 seconds.
          </p>
          <div className="mx-auto flex aspect-video max-w-lg items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--card)]">
            <div className="flex flex-col items-center gap-2 text-zinc-300 dark:text-zinc-600">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span className="font-mono text-xs">Demo video coming soon</span>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* COMPETITOR COMPARISON */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <section className="w-full px-4 py-16">
        <div className="mx-auto max-w-md text-center">
          <h2 className="mb-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Half the cost. Same result.
          </h2>
          <p className="mb-8 text-sm text-zinc-400 dark:text-zinc-500">
            Every dialer charges for fancy VoIP you don&apos;t need. We don&apos;t.
          </p>
          <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
            {COMPETITORS.map((c, i) => (
              <div
                key={c.name}
                className={`flex items-center justify-between px-5 py-3.5 ${
                  i !== 0 ? "border-t border-[var(--border)]" : ""
                } ${c.highlight ? "bg-[#22C55E]/5" : "bg-[var(--card)]"}`}
              >
                <span
                  className={`text-sm font-semibold ${
                    c.highlight ? "text-[#22C55E]" : "text-zinc-500 line-through decoration-zinc-300 dark:text-zinc-400 dark:decoration-zinc-600"
                  }`}
                >
                  {c.name}
                </span>
                <span
                  className={`font-mono text-sm font-bold ${
                    c.highlight ? "text-zinc-900 dark:text-white" : "text-zinc-400 dark:text-zinc-500"
                  }`}
                >
                  {c.price}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* FAQ */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <section className="w-full px-4 py-16">
        <div className="mx-auto max-w-lg">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">FAQ</h2>
          <div className="space-y-4">
            {FAQ.map((item) => (
              <div
                key={item.q}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 shadow-sm"
              >
                <div className="mb-2 flex items-start gap-2">
                  <div className="mt-0.5 shrink-0">
                    <CheckCircle />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{item.q}</h3>
                </div>
                <p className="pl-6 text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* SOCIAL PROOF */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <section className="w-full px-4 py-16">
        <div className="mx-auto max-w-md text-center">
          <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-[#22C55E]">
            Trusted by agents
          </p>
          <h2 className="mb-8 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Built for closers, by closers
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { quote: "Cut my dialing time in half. I'm closing 3x more appointments per day.", name: "— Coming soon" },
              { quote: "Finally a dialer that doesn't cost more than my leads.", name: "— Coming soon" },
            ].map((t, i) => (
              <div
                key={i}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 text-left shadow-sm"
              >
                <p className="mb-3 text-[13px] leading-relaxed text-zinc-600 italic dark:text-zinc-400">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <p className="font-mono text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">{t.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="w-full px-4 pb-20 pt-8 text-center">
        <Link
          href="/sign-up"
          className="inline-flex items-center gap-2 rounded-xl bg-[#22C55E] px-8 py-3 text-sm font-semibold text-white shadow-sm shadow-[#22C55E]/25 transition-all hover:bg-[#16A34A] hover:shadow-md hover:shadow-[#22C55E]/30 active:scale-[0.98]"
        >
          Start for free
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="w-full border-t border-[var(--border)] py-6 text-center">
        <p className="font-mono text-[10px] text-zinc-300 dark:text-zinc-600">
          &copy; {new Date().getFullYear()} SkipDial
        </p>
      </footer>
    </div>
  );
}
