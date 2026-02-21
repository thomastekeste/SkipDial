import type { ScriptSection } from "../lib/types";
import { ThemeToggle } from "./ThemeToggle";
import { XIcon, PlusIcon, TrashIcon, ChevronUpSmall, ChevronDownSmall } from "./Icons";
import { UserButton } from "@clerk/nextjs";

interface Props {
  isDark: boolean;
  onToggleTheme: () => void;
  scriptSections: ScriptSection[];
  onSetSections: (updater: (prev: ScriptSection[]) => ScriptSection[]) => void;
  onDone: () => void;
  hasLeads: boolean;
}

export function ScriptSetupView({
  isDark,
  onToggleTheme,
  scriptSections,
  onSetSections,
  onDone,
  hasLeads,
}: Props) {
  const addSection = () => {
    onSetSections((prev) => [...prev, { id: crypto.randomUUID(), title: "", body: "" }]);
  };
  const updateSection = (id: string, field: "title" | "body", value: string) => {
    onSetSections((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };
  const removeSection = (id: string) => {
    onSetSections((prev) => prev.filter((s) => s.id !== id));
  };
  const moveSection = (idx: number, dir: -1 | 1) => {
    onSetSections((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };
  const handlePasteScript = (text: string) => {
    if (!text.trim()) return;
    onSetSections(() => [{ id: crypto.randomUUID(), title: "FULL SCRIPT", body: text.trim() }]);
  };

  const showingSections = scriptSections.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <div className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--card)]">
        <div className="px-4 py-3">
          <div className="mx-auto flex max-w-2xl items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onDone}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <XIcon />
              </button>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Your Script</h2>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
              <UserButton />
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 rounded-xl border border-blue-200/50 bg-blue-50/50 px-4 py-3 dark:border-blue-500/10 dark:bg-blue-500/5">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Paste your entire script below, or build it in sections. Use{" "}
              <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-[11px] dark:bg-blue-500/10">{"{firstName}"}</code>{" "}
              <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-[11px] dark:bg-blue-500/10">{"{dob}"}</code>{" "}
              <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-[11px] dark:bg-blue-500/10">{"{state}"}</code>{" "}
              to auto-fill lead info during calls.
            </p>
          </div>

          {!showingSections && (
            <div className="mb-6">
              <textarea
                placeholder="Paste your full script here..."
                rows={12}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 text-[13px] leading-relaxed text-zinc-700 placeholder-zinc-300 shadow-sm outline-none transition-colors focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 dark:text-zinc-300 dark:placeholder-zinc-600"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    handlePasteScript((e.target as HTMLTextAreaElement).value);
                  }
                }}
                onBlur={(e) => handlePasteScript(e.target.value)}
              />
              <p className="mt-2 text-center font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                paste &amp; click away, or press{" "}
                <kbd className="rounded border border-[var(--border)] px-1 py-0.5">&#8984;Enter</kbd> to save
              </p>
              <div className="relative my-6 flex items-center">
                <div className="flex-1 border-t border-[var(--border)]" />
                <span className="px-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-zinc-300 dark:text-zinc-600">
                  or build in sections
                </span>
                <div className="flex-1 border-t border-[var(--border)]" />
              </div>
            </div>
          )}

          <div className="space-y-4">
            {scriptSections.map((sec, idx) => (
              <div
                key={sec.id}
                className="group rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-100 font-mono text-[10px] font-bold text-zinc-400 dark:bg-[#252525] dark:text-zinc-500">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    placeholder="Section title (e.g. INTRO, OBJECTIONS, CLOSE)"
                    value={sec.title}
                    onChange={(e) => updateSection(sec.id, "title", e.target.value)}
                    className="flex-1 bg-transparent text-sm font-bold text-zinc-900 placeholder-zinc-300 outline-none dark:text-white dark:placeholder-zinc-600"
                  />
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {idx > 0 && (
                      <button
                        onClick={() => moveSection(idx, -1)}
                        className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                        title="Move up"
                      >
                        <ChevronUpSmall />
                      </button>
                    )}
                    {idx < scriptSections.length - 1 && (
                      <button
                        onClick={() => moveSection(idx, 1)}
                        className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                        title="Move down"
                      >
                        <ChevronDownSmall />
                      </button>
                    )}
                    <button
                      onClick={() => removeSection(sec.id)}
                      className="rounded-md p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      title="Remove"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
                <textarea
                  placeholder="Paste or type your script for this section..."
                  value={sec.body}
                  onChange={(e) => updateSection(sec.id, "body", e.target.value)}
                  rows={6}
                  className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-zinc-700 placeholder-zinc-300 outline-none dark:text-zinc-300 dark:placeholder-zinc-600"
                />
              </div>
            ))}
          </div>

          <button
            onClick={addSection}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] py-3 text-sm font-medium text-zinc-400 transition-all hover:border-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:border-zinc-500 dark:hover:text-zinc-300"
          >
            <PlusIcon /> Add section
          </button>

          {scriptSections.length > 0 && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={onDone}
                className="rounded-xl bg-[#22C55E] px-8 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#22C55E]/25 transition-all hover:bg-[#16A34A] active:scale-[0.98]"
              >
                {hasLeads ? "Back to Leads" : "Done — Upload Leads"}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
