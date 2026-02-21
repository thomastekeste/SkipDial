"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Lead, ScriptSection, SessionStats, View } from "./lib/types";
import { INITIAL_STATS, SKIPPED_STATUSES } from "./lib/constants";
import { getCallWindow, parseCSV, buildDemoLeads, mapServerLeads } from "./lib/utils";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoaderIcon } from "./components/Icons";
import { UploadView } from "./components/UploadView";
import { ScriptSetupView } from "./components/ScriptSetupView";
import { ListView } from "./components/ListView";
import { DialingView } from "./components/DialingView";
import { ScriptView } from "./components/ScriptView";
import { PostCallView } from "./components/PostCallView";
import { SummaryView } from "./components/SummaryView";
import { PaywallView } from "./components/PaywallView";

export default function Dashboard() {
  const [view, setView] = useState<View>("upload");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [scriptSections, setScriptSections] = useState<ScriptSection[]>([]);

  const [dialQueue, setDialQueue] = useState<Lead[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [stats, setStats] = useState<SessionStats>(INITIAL_STATS);
  const [callStartTime, setCallStartTime] = useState(0);
  const [callDuration, setCallDuration] = useState(0);
  const [autoAdvancing, setAutoAdvancing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueIndexRef = useRef(0);
  const dialQueueRef = useRef<Lead[]>([]);

  queueIndexRef.current = queueIndex;
  dialQueueRef.current = dialQueue;

  const currentLead = dialQueue[queueIndex] || null;

  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("loading");

  // ── Toast ──────────────────────────────────────────────────────────────────

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  }, []);

  // ── Initialization ─────────────────────────────────────────────────────────

  useEffect(() => {
    const stored = localStorage.getItem("skipdial-theme");
    const dark = stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);

    const cachedScript = localStorage.getItem("skipdial-script");
    if (cachedScript) {
      try {
        const parsed = JSON.parse(cachedScript) as ScriptSection[];
        if (parsed.length > 0) setScriptSections(parsed);
      } catch { /* corrupt cache */ }
    }
    const cachedLeads = localStorage.getItem("skipdial-leads");
    if (cachedLeads) {
      try {
        const parsed = JSON.parse(cachedLeads) as Lead[];
        if (parsed.length > 0) {
          setLeads(parsed);
          setView("list");
        }
      } catch { /* corrupt cache */ }
    }

    setMounted(true);

    (async () => {
      try {
        const userRes = await fetch("/api/user");
        if (userRes.ok) {
          const user = await userRes.json();
          const status = user.subscription_status || "none";
          setSubscriptionStatus(status);
          if (user.stripe_configured && status !== "active") {
            setView("paywall");
          }
        } else {
          setSubscriptionStatus("none");
        }
      } catch {
        setSubscriptionStatus("none");
        showToast("Could not load user data");
      }

      try {
        const [leadsRes, scriptRes] = await Promise.all([fetch("/api/leads"), fetch("/api/scripts")]);
        if (leadsRes.ok) {
          const serverLeads = await leadsRes.json();
          if (Array.isArray(serverLeads) && serverLeads.length > 0) {
            const mapped = mapServerLeads(serverLeads);
            setLeads(mapped);
            setView("list");
            localStorage.setItem("skipdial-leads", JSON.stringify(mapped));
          } else {
            setLeads([]);
            setView("upload");
            localStorage.removeItem("skipdial-leads");
          }
        }
        if (scriptRes.ok) {
          const serverScript = await scriptRes.json();
          if (Array.isArray(serverScript) && serverScript.length > 0) {
            setScriptSections(serverScript);
            localStorage.setItem("skipdial-script", JSON.stringify(serverScript));
          } else {
            setScriptSections([]);
            localStorage.removeItem("skipdial-script");
          }
        }
      } catch {
        showToast("Offline — using cached data");
      }

      setIsLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Theme ──────────────────────────────────────────────────────────────────

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("skipdial-theme", next ? "dark" : "light");
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  }, []);

  // ── Persist to localStorage ────────────────────────────────────────────────

  useEffect(() => {
    if (!mounted) return;
    if (leads.length > 0) localStorage.setItem("skipdial-leads", JSON.stringify(leads));
  }, [leads, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("skipdial-script", JSON.stringify(scriptSections));
  }, [scriptSections, mounted]);

  // ── Lead helpers ───────────────────────────────────────────────────────────

  const updateLeadStatus = useCallback(
    (leadId: number, newStatus: string, newVmCount?: number) => {
      const updater = (l: Lead): Lead =>
        l.id === leadId
          ? { ...l, status: newStatus, vmCount: newVmCount !== undefined ? newVmCount : l.vmCount }
          : l;
      setLeads((prev) => prev.map(updater));
      setDialQueue((prev) => prev.map(updater));
      fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: leadId,
          status: newStatus,
          ...(newVmCount !== undefined ? { vm_count: newVmCount } : {}),
        }),
      }).catch(() => showToast("Failed to save lead status"));
    },
    [showToast]
  );

  // ── Queue navigation ──────────────────────────────────────────────────────

  const advanceToNext = useCallback(() => {
    setAutoAdvancing(false);
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    const nextIdx = queueIndexRef.current + 1;
    if (nextIdx >= dialQueueRef.current.length) {
      setView("summary");
      return;
    }
    setQueueIndex(nextIdx);
    setCallDuration(0);
    setCallStartTime(0);
    setView("dialing");
  }, []);

  const startAutoAdvance = useCallback(() => {
    setAutoAdvancing(true);
    autoAdvanceRef.current = setTimeout(() => advanceToNext(), 1500);
  }, [advanceToNext]);

  // ── Cleanup ────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // ── File handling ──────────────────────────────────────────────────────────

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const parsed = parseCSV(text);
        if (parsed.length > 0) {
          setLeads(parsed);
          setView("list");
          try {
            await fetch("/api/leads", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ leads: parsed }),
            });
          } catch {
            showToast("Leads saved locally — sync failed");
          }
        }
      };
      reader.readAsText(file);
    },
    [showToast]
  );

  const handleLoadDemo = useCallback(() => {
    const demo = buildDemoLeads();
    setLeads(demo);
    setView("list");
    fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leads: demo }),
    }).catch(() => showToast("Demo saved locally — sync failed"));
  }, [showToast]);

  const handleNewList = useCallback(() => {
    localStorage.removeItem("skipdial-leads");
    setLeads([]);
    setView("upload");
    fetch("/api/leads", { method: "DELETE" }).catch(() =>
      showToast("Could not clear server leads")
    );
  }, [showToast]);

  const syncScriptToServer = useCallback(
    (sections: ScriptSection[]) => {
      fetch("/api/scripts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections }),
      }).catch(() => showToast("Script saved locally — sync failed"));
    },
    [showToast]
  );

  const handleScriptDone = useCallback(() => {
    syncScriptToServer(scriptSections);
    setView(leads.length > 0 ? "list" : "upload");
  }, [syncScriptToServer, scriptSections, leads.length]);

  // ── Session controls ──────────────────────────────────────────────────────

  const startSession = useCallback(
    (startLeadId?: number) => {
      const queue = leads
        .filter((l) => getCallWindow(l.state).score > 0 && !SKIPPED_STATUSES.has(l.status))
        .sort((a, b) => {
          const aNew = a.status === "NEW LEAD" ? 0 : 1;
          const bNew = b.status === "NEW LEAD" ? 0 : 1;
          if (aNew !== bNew) return aNew - bNew;
          const aW = getCallWindow(a.state);
          const bW = getCallWindow(b.state);
          if (bW.score !== aW.score) return bW.score - aW.score;
          return (b.age || 0) - (a.age || 0);
        });
      if (queue.length === 0) {
        showToast("No dialable leads");
        return;
      }
      let startIdx = 0;
      if (startLeadId !== undefined) {
        const idx = queue.findIndex((l) => l.id === startLeadId);
        if (idx !== -1) startIdx = idx;
      }
      setDialQueue(queue);
      setQueueIndex(startIdx);
      setStats(INITIAL_STATS);
      setSessionPaused(false);
      setAutoAdvancing(false);
      setCallDuration(0);
      setCallStartTime(0);
      setView("dialing");
    },
    [leads, showToast]
  );

  const handlePrev = useCallback(() => {
    if (queueIndex <= 0) return;
    setAutoAdvancing(false);
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    setQueueIndex(queueIndex - 1);
    setCallDuration(0);
    setCallStartTime(0);
    setView("dialing");
  }, [queueIndex]);

  const handleSkip = useCallback(() => advanceToNext(), [advanceToNext]);

  const handlePauseResume = useCallback(() => {
    if (sessionPaused) {
      setSessionPaused(false);
    } else {
      setSessionPaused(true);
      setAutoAdvancing(false);
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    }
  }, [sessionPaused]);

  const handleStop = useCallback(() => {
    setAutoAdvancing(false);
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    setView("summary");
  }, []);

  // ── Dialing outcomes ──────────────────────────────────────────────────────

  const handleDialVM = useCallback(() => {
    if (!currentLead) return;
    const cnt = Math.min(currentLead.vmCount + 1, 3);
    const vmStatus = `${cnt}x VM`;
    updateLeadStatus(currentLead.id, vmStatus, cnt);
    setStats((p) => ({ ...p, calls: p.calls + 1, voicemails: p.voicemails + 1 }));
    showToast(`Left VM — ${vmStatus}`);
    startAutoAdvance();
  }, [currentLead, updateLeadStatus, showToast, startAutoAdvance]);

  const handleOpenScript = useCallback(() => {
    if (!currentLead) return;
    setView("script");
  }, [currentLead]);

  const handleDialNoAnswer = useCallback(() => {
    if (!currentLead) return;
    setStats((p) => ({ ...p, calls: p.calls + 1 }));
    showToast("No answer — skipping");
    startAutoAdvance();
  }, [currentLead, showToast, startAutoAdvance]);

  const handleDialBadNumber = useCallback(() => {
    if (!currentLead) return;
    updateLeadStatus(currentLead.id, "Bad #");
    setStats((p) => ({ ...p, calls: p.calls + 1, badNumbers: p.badNumbers + 1 }));
    showToast("Marked as Bad #");
    startAutoAdvance();
  }, [currentLead, updateLeadStatus, showToast, startAutoAdvance]);

  const endCall = useCallback(() => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    setStats((p) => ({ ...p, calls: p.calls + 1 }));
    setView("postcall");
  }, []);

  // ── Post-call ─────────────────────────────────────────────────────────────

  const handleOutcome = useCallback(
    (outcome: string) => {
      if (!currentLead) return;
      let newStatus = "Follow Up";
      const su: Partial<SessionStats> = {};
      switch (outcome) {
        case "followup":
          newStatus = "Follow Up";
          su.callbacks = 1;
          break;
        case "appointment":
          newStatus = "Scheduled Appt";
          su.appointments = 1;
          break;
        case "sold":
          newStatus = "SOLD";
          su.sold = 1;
          break;
        case "not_interested":
          newStatus = "Not Interested";
          su.notInterested = 1;
          break;
        case "bad_number":
          newStatus = "Bad #";
          su.badNumbers = 1;
          break;
      }
      updateLeadStatus(currentLead.id, newStatus);
      setStats((prev) => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(su)) (next as Record<string, number>)[k] += v as number;
        return next;
      });
      showToast(`Marked as ${newStatus}`);
      setTimeout(() => advanceToNext(), 800);
    },
    [currentLead, updateLeadStatus, showToast, advanceToNext]
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!mounted) return null;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-3 text-zinc-400">
          <LoaderIcon />
          <span className="font-mono text-xs">Loading…</span>
        </div>
      </div>
    );
  }

  let viewContent: React.ReactNode;

  switch (view) {
    case "upload":
      viewContent = (
        <UploadView
          isDark={isDark}
          onToggleTheme={toggleTheme}
          scriptSections={scriptSections}
          onGoScriptSetup={() => setView("script-setup")}
          onFileLoaded={handleFile}
          onLoadDemo={handleLoadDemo}
          leads={leads}
        />
      );
      break;

    case "script-setup":
      viewContent = (
        <ScriptSetupView
          isDark={isDark}
          onToggleTheme={toggleTheme}
          scriptSections={scriptSections}
          onSetSections={setScriptSections}
          onDone={handleScriptDone}
          hasLeads={leads.length > 0}
        />
      );
      break;

    case "list":
      viewContent = (
        <ListView
          leads={leads}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          onStartSession={startSession}
          onGoScriptSetup={() => setView("script-setup")}
          onNewList={handleNewList}
          scriptSections={scriptSections}
        />
      );
      break;

    case "dialing":
      viewContent = (
        <DialingView
          isDark={isDark}
          onToggleTheme={toggleTheme}
          currentLead={currentLead}
          queueIndex={queueIndex}
          dialQueue={dialQueue}
          stats={stats}
          sessionPaused={sessionPaused}
          onPauseResume={handlePauseResume}
          onPrev={handlePrev}
          onSkip={handleSkip}
          onStop={handleStop}
          onDialVM={handleDialVM}
          onOpenScript={handleOpenScript}
          onDialNoAnswer={handleDialNoAnswer}
          onDialBadNumber={handleDialBadNumber}
          autoAdvancing={autoAdvancing}
        />
      );
      break;

    case "script":
      viewContent = (
        <ScriptView
          currentLead={currentLead}
          scriptSections={scriptSections}
          stats={stats}
          onClose={() => setView("dialing")}
          onEndCall={endCall}
          onStop={handleStop}
        />
      );
      break;

    case "postcall":
      viewContent = (
        <PostCallView
          isDark={isDark}
          onToggleTheme={toggleTheme}
          currentLead={currentLead}
          onOutcome={handleOutcome}
          onSkip={advanceToNext}
        />
      );
      break;

    case "summary":
      viewContent = (
        <SummaryView
          isDark={isDark}
          onToggleTheme={toggleTheme}
          stats={stats}
          onBackToLeads={() => setView("list")}
          onDialAgain={() => startSession()}
        />
      );
      break;

    case "paywall":
      viewContent = <PaywallView isDark={isDark} onToggleTheme={toggleTheme} showToast={showToast} />;
      break;
  }

  return (
    <ErrorBoundary>
      {viewContent}
      {toast && (
        <div className="animate-toast-enter fixed bottom-6 left-1/2 z-[100] -translate-x-1/2">
          <div className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg dark:bg-white dark:text-zinc-900">
            {toast}
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
}
