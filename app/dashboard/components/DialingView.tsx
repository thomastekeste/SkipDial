import { useState, useEffect, useRef, useCallback } from "react";
import type { Lead, SessionStats } from "../lib/types";
import { getCallWindow, formatPhone, getInitials, getAvatarColor, openDialer } from "../lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import {
  PhoneIcon,
  PhoneOffIcon,
  FileTextIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  ChevronLeftIcon,
  SkipForwardIcon,
} from "./Icons";

interface Props {
  isDark: boolean;
  onToggleTheme: () => void;
  currentLead: Lead | null;
  queueIndex: number;
  dialQueue: Lead[];
  stats: SessionStats;
  sessionPaused: boolean;
  onPauseResume: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onStop: () => void;
  onDialVM: () => void;
  onOpenScript: () => void;
  onDialNoAnswer: () => void;
  onDialBadNumber: () => void;
  autoAdvancing: boolean;
}

const COUNTDOWN_SECONDS = 3;

export function DialingView({
  isDark,
  onToggleTheme,
  currentLead,
  queueIndex,
  dialQueue,
  stats,
  sessionPaused,
  onPauseResume,
  onPrev,
  onSkip,
  onStop,
  onDialVM,
  onOpenScript,
  onDialNoAnswer,
  onDialBadNumber,
  autoAdvancing,
}: Props) {
  const [dialed, setDialed] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastDialedRef = useRef<number | null>(null);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(null);
  }, []);

  useEffect(() => {
    if (sessionPaused || !currentLead) return;
    if (lastDialedRef.current === currentLead.id) return;

    setDialed(false);
    setCountdown(COUNTDOWN_SECONDS);

    let remaining = COUNTDOWN_SECONDS;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearCountdown();
        if (currentLead) {
          lastDialedRef.current = currentLead.id;
          openDialer(currentLead.phone);
          setDialed(true);
        }
      } else {
        setCountdown(remaining);
      }
    }, 1000);

    return () => clearCountdown();
  }, [currentLead, sessionPaused, clearCountdown]);

  useEffect(() => {
    return () => clearCountdown();
  }, [clearCountdown]);

  const cancelCountdown = useCallback(() => {
    clearCountdown();
    if (currentLead) lastDialedRef.current = currentLead.id;
    setDialed(false);
  }, [clearCountdown, currentLead]);

  const cw = currentLead ? getCallWindow(currentLead.state) : null;
  const progress = dialQueue.length > 0 ? ((queueIndex + 1) / dialQueue.length) * 100 : 0;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <div className="absolute left-4 top-4 z-50">
        <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
      </div>

      <div className="border-b border-[var(--border)] bg-[var(--card)] px-4 pt-14 pb-4">
        <div className="mx-auto max-w-md">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {queueIndex + 1}/{dialQueue.length}
            </span>
            <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
              {stats.appointments > 0 && (
                <span className="text-[#22C55E]">
                  {stats.appointments} appt{stats.appointments !== 1 ? "s" : ""}
                </span>
              )}
              {stats.sold > 0 && <span className="ml-2 text-[#22C55E]">{stats.sold} sold</span>}
              {stats.voicemails > 0 && (
                <span className="ml-2 text-[#EAB308]">
                  {stats.voicemails} VM{stats.voicemails !== 1 ? "s" : ""}
                </span>
              )}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div className="h-full rounded-full bg-[#22C55E] transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4">
        {currentLead && (
          <div className="animate-fade-in-up flex flex-col items-center text-center" key={currentLead.id}>
            <div
              className={`mb-6 flex h-20 w-20 items-center justify-center rounded-[14px] text-xl font-bold text-white ${
                !sessionPaused && !dialed && countdown === null ? "animate-dial-pulse" : ""
              }`}
              style={{ backgroundColor: getAvatarColor(currentLead.name) }}
            >
              {getInitials(currentLead.name)}
            </div>

            <p
              className={`mb-3 font-mono text-xs font-bold uppercase tracking-[0.25em] ${
                sessionPaused ? "text-[#EAB308]" : dialed ? "text-[#22C55E]" : "text-[#22C55E]"
              }`}
            >
              {sessionPaused ? "PAUSED" : countdown !== null ? `DIALING IN ${countdown}...` : dialed ? "ON CALL" : "DIALING"}
            </p>

            {countdown !== null && (
              <button
                onClick={cancelCountdown}
                className="mb-3 rounded-lg border border-red-300 px-4 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
              >
                Cancel
              </button>
            )}

            {autoAdvancing && !sessionPaused && (
              <>
                <div className="mb-3 h-1 w-40 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                  <div className="animate-countdown h-full rounded-full bg-[#22C55E]" />
                </div>
                <p className="mb-3 text-[10px] font-medium text-zinc-400 dark:text-zinc-500">auto-advancing…</p>
              </>
            )}

            <h2 className="mb-1 text-[32px] font-black leading-tight text-zinc-900 dark:text-white">
              {currentLead.name}
            </h2>
            <p className="mb-1 font-mono text-sm text-zinc-400">{formatPhone(currentLead.phone)}</p>
            <p className="mb-6 text-xs text-zinc-400 dark:text-zinc-500">
              {[currentLead.age ? `Age ${currentLead.age}` : null, currentLead.state || null, cw ? cw.label : null]
                .filter(Boolean)
                .join(" · ")}
            </p>

            {!autoAdvancing && countdown === null && (
              <button
                onClick={() => {
                  openDialer(currentLead.phone);
                  lastDialedRef.current = currentLead.id;
                  setDialed(true);
                }}
                className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#22C55E] text-white shadow-lg shadow-[#22C55E]/25 transition-all hover:bg-[#16A34A] active:scale-95"
              >
                <PhoneIcon />
              </button>
            )}

            {dialed && !autoAdvancing && !sessionPaused && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={onDialVM}
                  className="rounded-xl bg-[#EAB308]/10 px-4 py-2.5 text-xs font-bold text-[#EAB308] transition-colors hover:bg-[#EAB308]/20"
                >
                  Left VM
                </button>
                <button
                  onClick={onOpenScript}
                  className="flex items-center gap-1.5 rounded-xl bg-[#22C55E]/10 px-4 py-2.5 text-xs font-bold text-[#22C55E] transition-colors hover:bg-[#22C55E]/20"
                >
                  <FileTextIcon /> Script
                </button>
                <button
                  onClick={() => {
                    setDialed(false);
                    onDialNoAnswer();
                  }}
                  className="rounded-xl bg-zinc-500/10 px-4 py-2.5 text-xs font-bold text-zinc-500 transition-colors hover:bg-zinc-500/20 dark:text-zinc-400"
                >
                  No Answer
                </button>
                <button
                  onClick={onDialBadNumber}
                  className="rounded-xl bg-[#EF4444]/10 px-4 py-2.5 text-xs font-bold text-[#EF4444] transition-colors hover:bg-[#EF4444]/20"
                >
                  Bad #
                </button>
              </div>
            )}

            {sessionPaused && (
              <button
                onClick={onPauseResume}
                className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#22C55E] text-white shadow-lg shadow-[#22C55E]/25 transition-all hover:bg-[#16A34A] active:scale-95"
              >
                <PlayIcon />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-[var(--border)] bg-[var(--card)] px-4 py-4">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <button
            onClick={onPrev}
            disabled={queueIndex === 0}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <ChevronLeftIcon /> Prev
          </button>
          <button
            onClick={onSkip}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Skip <SkipForwardIcon />
          </button>
          <button
            onClick={onPauseResume}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            {sessionPaused ? (
              <>
                <PlayIcon /> Resume
              </>
            ) : (
              <>
                <PauseIcon /> Pause
              </>
            )}
          </button>
          <button
            onClick={onStop}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            <StopIcon /> Stop
          </button>
        </div>
      </div>

      {/* Re-dial button when phone dialer was dismissed */}
      {dialed && !autoAdvancing && !sessionPaused && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2">
          <button
            onClick={() => {
              if (currentLead) openDialer(currentLead.phone);
            }}
            className="flex items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white shadow-lg dark:bg-white dark:text-zinc-900"
          >
            <PhoneOffIcon /> Re-dial
          </button>
        </div>
      )}
    </div>
  );
}
