import { ThemeToggle } from "./ThemeToggle";
import { BoltIcon } from "./Icons";
import { UserButton } from "@clerk/nextjs";

interface Props {
  isDark: boolean;
  onToggleTheme: () => void;
  showToast: (msg: string) => void;
}

const PLANS = [
  {
    key: "solo",
    name: "Solo",
    price: "$39",
    per: "/mo",
    desc: "For individual agents",
    features: ["Unlimited leads", "Power dial queue", "Time-zone smart sorting", "Custom sales scripts", "Session analytics"],
  },
  {
    key: "team",
    name: "Team",
    price: "$29",
    per: "/seat/mo",
    desc: "For sales teams",
    features: ["Everything in Solo", "Per-seat pricing", "Team management", "Shared lead lists", "Priority support"],
  },
];

export function PaywallView({ isDark, onToggleTheme, showToast }: Props) {
  const handleCheckout = async (planKey: string) => {
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else showToast(data.error || "Checkout unavailable");
    } catch {
      showToast("Failed to start checkout");
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="absolute left-4 top-4 flex items-center gap-2">
        <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
        <UserButton />
      </div>
      <div className="animate-pulse-glow absolute h-52 w-52 rounded-full bg-[#22C55E]/10 blur-3xl" />
      <div className="animate-fade-in-up relative z-10 flex flex-col items-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg shadow-[#22C55E]/20 dark:bg-[#1C1C1C]">
          <BoltIcon size={32} />
        </div>
        <h1 className="mb-1.5 text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
          Choose your plan
        </h1>
        <p className="mb-8 text-sm text-zinc-400 dark:text-zinc-500">Start closing more deals today.</p>

        <div className="flex w-full max-w-lg flex-col gap-4 sm:flex-row">
          {PLANS.map((p) => (
            <div
              key={p.key}
              className={`flex-1 rounded-2xl border p-6 shadow-sm transition-all ${
                p.key === "solo"
                  ? "border-[#22C55E]/40 bg-[#22C55E]/5 dark:border-[#22C55E]/20"
                  : "border-[var(--border)] bg-[var(--card)]"
              }`}
            >
              <div className="mb-4">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{p.name}</h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">{p.desc}</p>
              </div>
              <div className="mb-5 flex items-baseline gap-1">
                <span className="text-3xl font-black text-zinc-900 dark:text-white">{p.price}</span>
                <span className="text-sm text-zinc-400">{p.per}</span>
              </div>
              <ul className="mb-6 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                    <span className="text-[#22C55E]">&#10003;</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleCheckout(p.key)}
                className={`w-full rounded-xl py-2.5 text-sm font-semibold transition-all active:scale-[0.98] ${
                  p.key === "solo"
                    ? "bg-[#22C55E] text-white shadow-sm shadow-[#22C55E]/25 hover:bg-[#16A34A]"
                    : "border border-[var(--border)] text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                Get Started
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
