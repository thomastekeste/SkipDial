import { useMemo, useState } from "react";
import type { Lead, ScriptSection } from "../lib/types";
import { getCallWindow, formatPhone, getInitials, getAvatarColor } from "../lib/utils";
import { SKIPPED_STATUSES } from "../lib/constants";
import { ThemeToggle } from "./ThemeToggle";
import { StatusBadge } from "./StatusBadge";
import { BoltIcon, PlayIcon, SearchIcon } from "./Icons";
import { UserButton } from "@clerk/nextjs";

interface Props {
  leads: Lead[];
  isDark: boolean;
  onToggleTheme: () => void;
  onStartSession: (startLeadId?: number) => void;
  onGoScriptSetup: () => void;
  onNewList: () => void;
  scriptSections: ScriptSection[];
}

export function ListView({
  leads,
  isDark,
  onToggleTheme,
  onStartSession,
  onGoScriptSetup,
  onNewList,
  scriptSections,
}: Props) {
  const [search, setSearch] = useState("");

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.phone.includes(q) ||
          l.state.toLowerCase().includes(q) ||
          l.status.toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => {
      const aNew = a.status === "NEW LEAD" ? 1 : 0;
      const bNew = b.status === "NEW LEAD" ? 1 : 0;
      if (aNew !== bNew) return aNew - bNew;
      const aW = getCallWindow(a.state);
      const bW = getCallWindow(b.state);
      if (bW.score !== aW.score) return bW.score - aW.score;
      return (b.age || 0) - (a.age || 0);
    });
  }, [leads, search]);

  const dialableCount = useMemo(
    () => leads.filter((l) => getCallWindow(l.state).score > 0 && !SKIPPED_STATUSES.has(l.status)).length,
    [leads]
  );

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <div className="fixed left-4 top-4 z-50">
        <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
      </div>
      <div className="fixed right-4 top-4 z-50 flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Personal Line
          </span>
        </div>
        <UserButton />
      </div>

      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-4 pb-4 pt-14">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-[#1C1C1C]">
              <BoltIcon size={16} />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">SkipDial</h1>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 font-mono text-xs font-medium text-zinc-500 dark:bg-[#252525] dark:text-zinc-400">
              {leads.length}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => onStartSession()}
              className="flex items-center gap-2 rounded-xl bg-[#22C55E] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#22C55E]/25 transition-all hover:bg-[#16A34A] hover:shadow-md hover:shadow-[#22C55E]/30 active:scale-[0.98]"
            >
              <PlayIcon /> Power Dial {dialableCount} leads
            </button>
            <button
              onClick={onGoScriptSetup}
              className="rounded-xl border border-[var(--border)] bg-transparent px-4 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-[var(--card)] hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              {scriptSections.length > 0 ? "Edit Script" : "Add Script"}
            </button>
            <button
              onClick={onNewList}
              className="rounded-xl border border-[var(--border)] bg-transparent px-4 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-[var(--card)] hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              New list
            </button>
          </div>
          <div className="relative mt-4">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] py-2.5 pl-10 pr-4 text-sm text-zinc-800 placeholder-zinc-400 outline-none transition-colors focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 dark:text-zinc-200 dark:placeholder-zinc-500"
            />
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-2">
          {filteredLeads.map((lead) => {
            const cw = getCallWindow(lead.state);
            return (
              <button
                key={lead.id}
                onClick={() => onStartSession(lead.id)}
                className="group flex w-full items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-left shadow-sm transition-all hover:shadow-md dark:hover:border-zinc-600"
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-sm font-bold text-white"
                  style={{ backgroundColor: getAvatarColor(lead.name) }}
                >
                  {getInitials(lead.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{lead.name}</p>
                  <p className="mt-0.5 truncate text-xs text-zinc-400 dark:text-zinc-500">
                    {[
                      lead.age ? `Age ${lead.age}` : null,
                      lead.state || null,
                      lead.phone ? formatPhone(lead.phone) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {lead.state && (
                    <span className="font-mono text-xs font-medium" style={{ color: cw.color }}>
                      {cw.time}
                    </span>
                  )}
                  <StatusBadge status={lead.status} isDark={isDark} />
                </div>
              </button>
            );
          })}
          {filteredLeads.length === 0 && (
            <div className="flex flex-col items-center py-20">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-300 dark:bg-[#252525] dark:text-zinc-600">
                <SearchIcon />
              </div>
              <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500">
                {search ? "No leads match your search" : "No leads loaded"}
              </p>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-[var(--border)] bg-[var(--background)] px-4 py-3 text-center">
        <p className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
          {filteredLeads.length} of {leads.length} leads{leads.length > 0 && ` · ${dialableCount} dialable`}
        </p>
      </footer>
    </div>
  );
}
