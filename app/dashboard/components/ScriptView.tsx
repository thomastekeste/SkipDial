import { useState } from "react";
import type { Lead, ScriptSection, SessionStats } from "../lib/types";
import { XIcon, ChevronDownIcon, PhoneOffIcon, StopIcon } from "./Icons";

interface Props {
  currentLead: Lead | null;
  scriptSections: ScriptSection[];
  stats: SessionStats;
  onClose: () => void;
  onEndCall: () => void;
  onStop: () => void;
}

export function ScriptView({ currentLead, scriptSections, stats, onClose, onEndCall, onStop }: Props) {
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(scriptSections.length > 0 ? [scriptSections[0].id] : [])
  );

  const firstName = currentLead ? currentLead.name.split(" ")[0] : "___";
  const leadDob = currentLead?.dob || "___";
  const leadState = currentLead?.state || "___";

  const fillVars = (text: string) =>
    text
      .replace(/\{firstName\}/g, firstName)
      .replace(/\{dob\}/g, leadDob)
      .replace(/\{state\}/g, leadState);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <div className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--card)]">
        <div className="px-4 py-3">
          <div className="mx-auto flex max-w-2xl items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <XIcon />
              </button>
              {currentLead && (
                <div>
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">{currentLead.name}</span>
                  <span className="ml-2 text-xs text-zinc-400 dark:text-zinc-500">
                    {[currentLead.age ? `Age ${currentLead.age}` : null, currentLead.state]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
              )}
            </div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Script</p>
          </div>
        </div>
        <div className="border-t border-[var(--border)] px-4 py-2">
          <div className="mx-auto flex max-w-2xl items-center justify-between">
            <div className="flex items-center gap-3">
              {[
                { label: "Calls", value: stats.calls },
                { label: "VMs", value: stats.voicemails },
                { label: "Appts", value: stats.appointments },
                { label: "Sold", value: stats.sold },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-1 text-[10px]">
                  <span className="font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    {s.label}
                  </span>
                  <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">{s.value}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onEndCall}
                className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-red-600 active:scale-[0.98]"
              >
                <PhoneOffIcon /> End
              </button>
              <button
                onClick={onStop}
                className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <StopIcon />
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-3">
          {scriptSections.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <p className="text-sm text-zinc-400 dark:text-zinc-500">No script loaded</p>
              <p className="mt-1 text-xs text-zinc-300 dark:text-zinc-600">Set up your script from the dashboard</p>
            </div>
          ) : (
            scriptSections.map((sec) => (
              <div key={sec.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
                <button
                  onClick={() => toggleSection(sec.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">{sec.title}</span>
                  <span
                    className={`text-zinc-400 transition-transform ${openSections.has(sec.id) ? "rotate-180" : ""}`}
                  >
                    <ChevronDownIcon />
                  </span>
                </button>
                {openSections.has(sec.id) && (
                  <div className="border-t border-[var(--border)] px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                    {fillVars(sec.body)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
