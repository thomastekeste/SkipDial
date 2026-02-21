import { SunIcon, MoonIcon } from "./Icons";

export function ThemeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      aria-label="Toggle theme"
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
