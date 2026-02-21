import type { SessionStats } from "../lib/types";
import { ThemeToggle } from "./ThemeToggle";
import { CheckIcon } from "./Icons";

interface Props {
  isDark: boolean;
  onToggleTheme: () => void;
  stats: SessionStats;
  onBackToLeads: () => void;
  onDialAgain: () => void;
}

export function SummaryView({ isDark, onToggleTheme, stats, onBackToLeads, onDialAgain }: Props) {
  const dead = stats.badNumbers + stats.notInterested;
  const cards = [
    { label: "Calls", value: stats.calls, color: "#3B82F6" },
    { label: "Voicemails", value: stats.voicemails, color: "#EAB308" },
    { label: "Appointments", value: stats.appointments, color: "#22C55E" },
    { label: "Sold", value: stats.sold, color: "#22C55E" },
    { label: "Callbacks", value: stats.callbacks, color: "#3B82F6" },
    { label: "Dead", value: dead, color: "#EF4444" },
  ];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="absolute left-4 top-4">
        <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
      </div>
      <div className="animate-fade-in-up w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#22C55E]/10 text-[#22C55E]">
          <CheckIcon />
        </div>
        <h2 className="mb-1 text-2xl font-bold text-zinc-900 dark:text-white">Session Complete</h2>
        <p className="mb-8 text-sm text-zinc-400 dark:text-zinc-500">
          <span className="font-mono font-semibold">{stats.calls}</span> calls made
        </p>
        <div className="grid grid-cols-3 gap-3">
          {cards.map((s) => (
            <div key={s.label} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
              <p className="font-mono text-2xl font-bold" style={{ color: s.color }}>
                {s.value}
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                {s.label}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={onBackToLeads}
            className="rounded-xl bg-[#22C55E] px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#22C55E]/25 transition-all hover:bg-[#16A34A] active:scale-[0.98]"
          >
            Back to Leads
          </button>
          <button
            onClick={onDialAgain}
            className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-[var(--card)] hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Dial Again
          </button>
        </div>
      </div>
    </div>
  );
}
