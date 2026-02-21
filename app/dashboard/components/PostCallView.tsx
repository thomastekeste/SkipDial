import type { Lead } from "../lib/types";
import { formatPhone, getInitials, getAvatarColor } from "../lib/utils";
import { ThemeToggle } from "./ThemeToggle";

interface Props {
  isDark: boolean;
  onToggleTheme: () => void;
  currentLead: Lead | null;
  onOutcome: (outcome: string) => void;
  onSkip: () => void;
}

const OUTCOMES = [
  { key: "followup", label: "Follow Up" },
  { key: "appointment", label: "Set Appointment" },
  { key: "sold", label: "SOLD" },
  { key: "not_interested", label: "Not Interested" },
  { key: "bad_number", label: "Bad Number" },
];

export function PostCallView({ isDark, onToggleTheme, currentLead, onOutcome, onSkip }: Props) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="absolute left-4 top-4">
        <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
      </div>
      <div className="animate-fade-in-up w-full max-w-sm text-center">
        {currentLead && (
          <>
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[10px] text-lg font-bold text-white"
              style={{ backgroundColor: getAvatarColor(currentLead.name) }}
            >
              {getInitials(currentLead.name)}
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{currentLead.name}</h2>
            <p className="mb-6 mt-1 font-mono text-sm text-zinc-400">{formatPhone(currentLead.phone)}</p>
          </>
        )}
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          What happened?
        </p>
        <div className="space-y-2">
          {OUTCOMES.map((o) => (
            <button
              key={o.key}
              onClick={() => onOutcome(o.key)}
              className="flex w-full items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3.5 text-left text-sm font-semibold text-zinc-800 shadow-sm transition-all hover:shadow-md active:scale-[0.99] dark:text-zinc-200 dark:hover:border-zinc-600"
            >
              {o.label}
            </button>
          ))}
        </div>
        <button
          onClick={onSkip}
          className="mt-5 text-sm font-medium text-zinc-400 underline-offset-4 transition-colors hover:text-zinc-600 hover:underline dark:text-zinc-500 dark:hover:text-zinc-300"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
