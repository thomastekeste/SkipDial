"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Lead {
  id: number;
  name: string;
  phone: string;
  dob: string;
  age: number | null;
  state: string;
  status: string;
  notes: string;
  vmCount: number;
}

type View = "upload" | "list" | "dialing" | "connected" | "postcall" | "summary";

interface SessionStats {
  calls: number;
  voicemails: number;
  appointments: number;
  sold: number;
  callbacks: number;
  badNumbers: number;
  notInterested: number;
}

const INITIAL_STATS: SessionStats = {
  calls: 0, voicemails: 0, appointments: 0, sold: 0,
  callbacks: 0, badNumbers: 0, notInterested: 0,
};

// ─── Constants ──────────────────────────────────────────────────────────────

const STATE_UTC_OFFSETS: Record<string, number> = {
  CT: -5, DC: -5, DE: -5, FL: -5, GA: -5, IN: -5, KY: -5,
  MA: -5, MD: -5, ME: -5, MI: -5, NC: -5, NH: -5, NJ: -5,
  NY: -5, OH: -5, PA: -5, RI: -5, SC: -5, TN: -5, VA: -5,
  VT: -5, WV: -5,
  AL: -6, AR: -6, IA: -6, IL: -6, KS: -6, LA: -6, MN: -6,
  MO: -6, MS: -6, ND: -6, NE: -6, OK: -6, SD: -6, TX: -6, WI: -6,
  AZ: -7, CO: -7, ID: -7, MT: -7, NM: -7, UT: -7, WY: -7,
  CA: -8, NV: -8, OR: -8, WA: -8,
  AK: -9,
  HI: -10,
};

const NO_DST_STATES = new Set(["AZ", "HI"]);

const AVATAR_COLORS = [
  "#6366F1", "#8B5CF6", "#EC4899", "#F97316",
  "#0EA5E9", "#14B8A6", "#84CC16", "#F59E0B",
];

const STATUS_STYLES: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  "NEW LEAD":       { bg: "#EFF6FF", text: "#3B82F6", darkBg: "#1E3A5F", darkText: "#60A5FA" },
  "Follow Up":      { bg: "#F0FDF4", text: "#22C55E", darkBg: "#14532D", darkText: "#4ADE80" },
  "1x VM":          { bg: "#FEFCE8", text: "#CA8A04", darkBg: "#422006", darkText: "#FACC15" },
  "2x VM":          { bg: "#FEFCE8", text: "#CA8A04", darkBg: "#422006", darkText: "#FACC15" },
  "3x VM":          { bg: "#FEF9C3", text: "#A16207", darkBg: "#422006", darkText: "#FACC15" },
  "Scheduled Appt": { bg: "#F0FDF4", text: "#22C55E", darkBg: "#14532D", darkText: "#4ADE80" },
  "SOLD":           { bg: "#F0FDF4", text: "#16A34A", darkBg: "#14532D", darkText: "#4ADE80" },
  "Bad #":          { bg: "#FEF2F2", text: "#EF4444", darkBg: "#450A0A", darkText: "#F87171" },
  "Not Interested": { bg: "#FAF5FF", text: "#A855F7", darkBg: "#3B0764", darkText: "#C084FC" },
  "DNC":            { bg: "#FEF2F2", text: "#EF4444", darkBg: "#450A0A", darkText: "#F87171" },
  "Already Covered":{ bg: "#F3F4F6", text: "#6B7280", darkBg: "#1F2937", darkText: "#9CA3AF" },
};

const SKIPPED_STATUSES = new Set(["SOLD", "Bad #", "Not Interested", "DNC", "Already Covered"]);

const DEMO_LEADS_RAW = [
  { name: "James Williams",    phone: "2025551234", dob: "03/15/1952", state: "VA", status: "NEW LEAD",       notes: "" },
  { name: "Dorothy Henderson", phone: "7135559876", dob: "07/22/1948", state: "TX", status: "NEW LEAD",       notes: "" },
  { name: "Robert Martinez",   phone: "3055554321", dob: "11/03/1955", state: "FL", status: "Follow Up",      notes: "Called Tuesday, wants to discuss with wife" },
  { name: "Mary Thompson",     phone: "6025558765", dob: "01/28/1960", state: "AZ", status: "NEW LEAD",       notes: "" },
  { name: "Charles Davis",     phone: "4045556789", dob: "09/14/1950", state: "GA", status: "1x VM",          notes: "" },
  { name: "Patricia Wilson",   phone: "2145553456", dob: "05/30/1958", state: "TX", status: "NEW LEAD",       notes: "" },
  { name: "Richard Brown",     phone: "7575552345", dob: "12/08/1945", state: "VA", status: "2x VM",          notes: "" },
  { name: "Barbara Jones",     phone: "9045557890", dob: "04/17/1953", state: "FL", status: "NEW LEAD",       notes: "" },
  { name: "William Anderson",  phone: "5105551122", dob: "08/25/1962", state: "CA", status: "NEW LEAD",       notes: "" },
  { name: "Linda Garcia",      phone: "3125553344", dob: "02/11/1957", state: "IL", status: "Scheduled Appt", notes: "Appt Thursday 2pm" },
  { name: "Thomas Clark",      phone: "8085559900", dob: "06/19/1949", state: "HI", status: "NEW LEAD",       notes: "" },
  { name: "Susan Taylor",      phone: "7705558877", dob: "10/02/1965", state: "GA", status: "Not Interested", notes: "Has coverage through employer" },
];

// ─── Utility Functions ──────────────────────────────────────────────────────

function isDST(): boolean {
  const now = new Date();
  return now.getMonth() >= 2 && now.getMonth() <= 10;
}

function getLocalHour(state: string): number | null {
  const offset = STATE_UTC_OFFSETS[state.toUpperCase()];
  if (offset === undefined) return null;
  const now = new Date();
  const utcHour = now.getUTCHours() + now.getUTCMinutes() / 60;
  let adj = offset;
  if (isDST() && !NO_DST_STATES.has(state.toUpperCase())) adj += 1;
  let h = utcHour + adj;
  if (h < 0) h += 24;
  if (h >= 24) h -= 24;
  return h;
}

function getCallWindow(state: string): { label: string; score: number; time: string; color: string } {
  const hour = getLocalHour(state);
  if (hour === null) return { label: "Unknown", score: 5, time: "--:--", color: "#6B7280" };
  const dh = Math.floor(hour);
  const dm = Math.floor((hour % 1) * 60);
  const ampm = dh >= 12 ? "PM" : "AM";
  const h12 = dh === 0 ? 12 : dh > 12 ? dh - 12 : dh;
  const time = `${h12}:${dm.toString().padStart(2, "0")} ${ampm}`;
  if (hour < 8)  return { label: "Too Early", score: 0,  time, color: "#EF4444" };
  if (hour < 10) return { label: "Prime",     score: 10, time, color: "#22C55E" };
  if (hour < 12) return { label: "Great",     score: 9,  time, color: "#22C55E" };
  if (hour < 14) return { label: "Lunch",     score: 7,  time, color: "#EAB308" };
  if (hour < 17) return { label: "Good",      score: 8,  time, color: "#3B82F6" };
  if (hour < 19) return { label: "Evening",   score: 6,  time, color: "#F97316" };
  if (hour < 21) return { label: "Late",      score: 3,  time, color: "#EF4444" };
  return { label: "Too Late", score: 0, time, color: "#EF4444" };
}

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  const c = d.startsWith("1") && d.length === 11 ? d.slice(1) : d;
  if (c.length === 10) return `(${c.slice(0,3)}) ${c.slice(3,6)}-${c.slice(6)}`;
  return phone;
}

function cleanPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  return d.startsWith("1") && d.length === 11 ? d.slice(1) : d;
}

function parseAge(dob: string): number | null {
  if (!dob) return null;
  const parts = dob.split("/");
  if (parts.length !== 3) return null;
  const [m, d, y] = parts.map(Number);
  if (!m || !d || !y) return null;
  const bd = new Date(y, m - 1, d);
  const today = new Date();
  let age = today.getFullYear() - bd.getFullYear();
  const md = today.getMonth() - bd.getMonth();
  if (md < 0 || (md === 0 && today.getDate() < bd.getDate())) age--;
  return age;
}

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).filter(Boolean).join("").toUpperCase().slice(0, 2);
}

function getAvatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function openDialer(phone: string) {
  const tel = `tel:+1${phone}`;
  const a = document.createElement("a");
  a.href = tel;
  a.click();
}

// ─── CSV Parser ─────────────────────────────────────────────────────────────

function parseCSV(text: string): Lead[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const delim = lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(delim).map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
  const fc = (p: string) => headers.findIndex(h => h.includes(p));
  const ni = fc("name"), pi = fc("phone"), di = fc("dob"), si = fc("state"), sti = fc("status"), noi = fc("note");
  if (ni === -1 || pi === -1) return [];
  const sm: Record<string, string> = {
    "new": "NEW LEAD", "new lead": "NEW LEAD",
    "follow up": "Follow Up", "callback": "Follow Up", "follow-up": "Follow Up",
    "vm": "1x VM", "voicemail": "1x VM", "1x vm": "1x VM", "2x vm": "2x VM", "3x vm": "3x VM",
    "appt": "Scheduled Appt", "appointment": "Scheduled Appt", "scheduled": "Scheduled Appt",
    "sold": "SOLD",
    "bad": "Bad #", "bad number": "Bad #", "bad #": "Bad #",
    "not interested": "Not Interested", "ni": "Not Interested",
    "dnc": "DNC", "do not call": "DNC",
    "covered": "Already Covered", "already covered": "Already Covered",
  };
  const leads: Lead[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delim).map(c => c.trim().replace(/^['"]|['"]$/g, ""));
    const name = cols[ni] || "", phone = cleanPhone(cols[pi] || "");
    if (!name || phone.length < 7) continue;
    const dob = di !== -1 ? cols[di] || "" : "";
    const state = si !== -1 ? (cols[si] || "").toUpperCase() : "";
    const status = sm[(sti !== -1 ? cols[sti] || "" : "").toLowerCase()] || "NEW LEAD";
    const notes = noi !== -1 ? cols[noi] || "" : "";
    let vmCount = 0;
    if (status === "1x VM") vmCount = 1; if (status === "2x VM") vmCount = 2; if (status === "3x VM") vmCount = 3;
    leads.push({ id: i, name, phone, dob, age: parseAge(dob), state, status, notes, vmCount });
  }
  return leads;
}

function buildDemoLeads(): Lead[] {
  return DEMO_LEADS_RAW.map((l, i) => ({
    id: i + 1, name: l.name, phone: cleanPhone(l.phone), dob: l.dob,
    age: parseAge(l.dob), state: l.state, status: l.status, notes: l.notes,
    vmCount: l.status.includes("VM") ? parseInt(l.status[0]) || 0 : 0,
  }));
}

// ─── SVG Icons ──────────────────────────────────────────────────────────────

function BoltIcon({ size = 32 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z" fill="#22C55E" /></svg>;
}
function SunIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>;
}
function MoonIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>;
}
function UploadIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>;
}
function SearchIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>;
}
function PlayIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>;
}
function PhoneIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>;
}
function PhoneOffIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" /><line x1="1" y1="1" x2="23" y2="23" /></svg>;
}
function PauseIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>;
}
function StopIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>;
}
function ChevronLeftIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>;
}
function SkipForwardIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" /></svg>;
}
function CheckIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ThemeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      aria-label="Toggle theme">
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function StatusBadge({ status, isDark }: { status: string; isDark: boolean }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES["NEW LEAD"];
  return (
    <span className="rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider"
      style={{ backgroundColor: isDark ? style.darkBg : style.bg, color: isDark ? style.darkText : style.text }}>
      {status}
    </span>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function Home() {
  // ── Core state ──────────────────────────────────────────────────────────
  const [view, setView] = useState<View>("upload");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [isDark, setIsDark] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Session state ───────────────────────────────────────────────────────
  const [dialQueue, setDialQueue] = useState<Lead[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [stats, setStats] = useState<SessionStats>(INITIAL_STATS);
  const [callStartTime, setCallStartTime] = useState(0);
  const [callDuration, setCallDuration] = useState(0);
  const [autoAdvancing, setAutoAdvancing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [dialed, setDialed] = useState(false);

  // ── Refs ────────────────────────────────────────────────────────────────
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueIndexRef = useRef(0);
  const dialQueueRef = useRef<Lead[]>([]);
  const lastDialedLeadIdRef = useRef<number | null>(null);

  queueIndexRef.current = queueIndex;
  dialQueueRef.current = dialQueue;

  const currentLead = dialQueue[queueIndex] || null;

  // ── Theme initialization ────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("skipdial-theme");
    const dark = stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
    setMounted(true);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("skipdial-theme", next ? "dark" : "light");
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────────────

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  }, []);

  const updateLeadStatus = useCallback((leadId: number, newStatus: string, newVmCount?: number) => {
    const updater = (l: Lead): Lead =>
      l.id === leadId ? { ...l, status: newStatus, vmCount: newVmCount !== undefined ? newVmCount : l.vmCount } : l;
    setLeads((prev) => prev.map(updater));
    setDialQueue((prev) => prev.map(updater));
  }, []);

  const advanceToNext = useCallback(() => {
    setAutoAdvancing(false);
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    lastDialedLeadIdRef.current = null;
    setDialed(false);
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

  // ── Auto-dial when entering dialing view for a new lead ─────────────────

  useEffect(() => {
    if (view !== "dialing" || sessionPaused || !currentLead) return;
    if (lastDialedLeadIdRef.current === currentLead.id) return;
    lastDialedLeadIdRef.current = currentLead.id;
    setDialed(false);

    const t = setTimeout(() => {
      openDialer(currentLead.phone);
      setDialed(true);
    }, 400);
    return () => clearTimeout(t);
  }, [view, sessionPaused, currentLead]);

  // ── Call duration timer ─────────────────────────────────────────────────

  useEffect(() => {
    if (view === "connected" && callStartTime > 0) {
      callTimerRef.current = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTime) / 1000));
      }, 250);
      return () => { if (callTimerRef.current) clearInterval(callTimerRef.current); };
    }
  }, [view, callStartTime]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // ── File handling ───────────────────────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length > 0) { setLeads(parsed); setView("list"); }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleLoadDemo = useCallback(() => { setLeads(buildDemoLeads()); setView("list"); }, []);
  const handleNewList = useCallback(() => { setLeads([]); setSearch(""); setView("upload"); }, []);

  // ── Session controls ────────────────────────────────────────────────────

  const startSession = useCallback((startLeadId?: number) => {
    const queue = leads
      .filter((l) => getCallWindow(l.state).score > 0 && !SKIPPED_STATUSES.has(l.status))
      .sort((a, b) => {
        const aW = getCallWindow(a.state), bW = getCallWindow(b.state);
        if (bW.score !== aW.score) return bW.score - aW.score;
        return (b.age || 0) - (a.age || 0);
      });
    if (queue.length === 0) { showToast("No dialable leads"); return; }
    let startIdx = 0;
    if (startLeadId !== undefined) {
      const idx = queue.findIndex(l => l.id === startLeadId);
      if (idx !== -1) startIdx = idx;
    }
    lastDialedLeadIdRef.current = null;
    setDialed(false);
    setDialQueue(queue);
    setQueueIndex(startIdx);
    setStats(INITIAL_STATS);
    setSessionPaused(false);
    setAutoAdvancing(false);
    setCallDuration(0);
    setCallStartTime(0);
    setView("dialing");
  }, [leads, showToast]);

  const handlePrev = useCallback(() => {
    if (queueIndex <= 0) return;
    lastDialedLeadIdRef.current = null;
    setDialed(false);
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

  // ── Dialing outcome handlers ───────────────────────────────────────────

  const handleDialVM = useCallback(() => {
    if (!currentLead) return;
    const cnt = Math.min(currentLead.vmCount + 1, 3);
    const vmStatus = `${cnt}x VM`;
    updateLeadStatus(currentLead.id, vmStatus, cnt);
    setStats((p) => ({ ...p, calls: p.calls + 1, voicemails: p.voicemails + 1 }));
    showToast(`Left VM — ${vmStatus}`);
    startAutoAdvance();
  }, [currentLead, updateLeadStatus, showToast, startAutoAdvance]);

  const handleDialAnswered = useCallback(() => {
    if (!currentLead) return;
    setStats((p) => ({ ...p, calls: p.calls + 1 }));
    setCallStartTime(Date.now());
    setCallDuration(0);
    setView("connected");
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
    setView("postcall");
  }, []);

  // ── Post-call outcome ───────────────────────────────────────────────────

  const handleOutcome = useCallback((outcome: string) => {
    if (!currentLead) return;
    let newStatus = "Follow Up";
    const su: Partial<SessionStats> = {};
    switch (outcome) {
      case "followup":       newStatus = "Follow Up";      su.callbacks = 1;      break;
      case "appointment":    newStatus = "Scheduled Appt"; su.appointments = 1;   break;
      case "sold":           newStatus = "SOLD";           su.sold = 1;           break;
      case "not_interested": newStatus = "Not Interested"; su.notInterested = 1;  break;
      case "bad_number":     newStatus = "Bad #";          su.badNumbers = 1;     break;
    }
    updateLeadStatus(currentLead.id, newStatus);
    setStats((prev) => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(su)) (next as Record<string, number>)[k] += v as number;
      return next;
    });
    showToast(`Marked as ${newStatus}`);
    setTimeout(() => advanceToNext(), 800);
  }, [currentLead, updateLeadStatus, showToast, advanceToNext]);

  // ── Derived state ───────────────────────────────────────────────────────

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.name.toLowerCase().includes(q) || l.phone.includes(q) ||
        l.state.toLowerCase().includes(q) || l.status.toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => {
      const aW = getCallWindow(a.state), bW = getCallWindow(b.state);
      if (bW.score !== aW.score) return bW.score - aW.score;
      return (b.age || 0) - (a.age || 0);
    });
  }, [leads, search]);

  const dialableCount = useMemo(() =>
    leads.filter(l => getCallWindow(l.state).score > 0 && !SKIPPED_STATUSES.has(l.status)).length,
  [leads]);

  // ── Render ──────────────────────────────────────────────────────────────

  if (!mounted) return null;

  let viewContent: React.ReactNode;

  // ════════════════════════════════════════════════════════════════════════
  // UPLOAD VIEW
  // ════════════════════════════════════════════════════════════════════════

  if (view === "upload") {
    viewContent = (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
        <div className="absolute left-4 top-4"><ThemeToggle isDark={isDark} onToggle={toggleTheme} /></div>
        <div className="animate-pulse-glow absolute h-52 w-52 rounded-full bg-[#22C55E]/10 blur-3xl" />
        <div className="animate-fade-in-up relative z-10 flex flex-col items-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg shadow-[#22C55E]/20 dark:bg-[#1C1C1C]"><BoltIcon size={32} /></div>
          <h1 className="mb-1.5 text-4xl font-black tracking-tight text-zinc-900 dark:text-white">SkipDial</h1>
          <p className="mb-10 text-sm font-medium tracking-wide text-zinc-400 dark:text-zinc-500">Stop dialing. Start closing.</p>
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragEnter={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`group w-full max-w-sm cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
              isDragging
                ? "border-[#22C55E] bg-[#22C55E]/5 shadow-lg shadow-[#22C55E]/10 dark:bg-[#22C55E]/10"
                : "border-[var(--border)] bg-[var(--card)] shadow-sm hover:border-zinc-300 hover:shadow-md dark:hover:border-zinc-600"
            }`}>
            <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400 transition-colors group-hover:bg-zinc-200 dark:bg-[#252525] dark:text-zinc-500 dark:group-hover:bg-[#2a2a2a]"><UploadIcon /></div>
            <h3 className="mb-1 text-base font-semibold text-zinc-800 dark:text-zinc-200">Upload your leads</h3>
            <p className="font-mono text-xs text-zinc-400 dark:text-zinc-500">CSV with NAME, PHONE, DOB, STATE</p>
          </div>
          <button onClick={handleLoadDemo} className="mt-6 text-sm font-medium text-zinc-400 underline-offset-4 transition-colors hover:text-zinc-600 hover:underline dark:text-zinc-500 dark:hover:text-zinc-300">Load demo data</button>
        </div>
      </div>
    );

  // ════════════════════════════════════════════════════════════════════════
  // SUMMARY VIEW
  // ════════════════════════════════════════════════════════════════════════

  } else if (view === "summary") {
    const dead = stats.badNumbers + stats.notInterested;
    const sc = [
      { label: "Calls", value: stats.calls, color: "#3B82F6" },
      { label: "Voicemails", value: stats.voicemails, color: "#EAB308" },
      { label: "Appointments", value: stats.appointments, color: "#22C55E" },
      { label: "Sold", value: stats.sold, color: "#22C55E" },
      { label: "Callbacks", value: stats.callbacks, color: "#3B82F6" },
      { label: "Dead", value: dead, color: "#EF4444" },
    ];
    viewContent = (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
        <div className="absolute left-4 top-4"><ThemeToggle isDark={isDark} onToggle={toggleTheme} /></div>
        <div className="animate-fade-in-up w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#22C55E]/10 text-[#22C55E]"><CheckIcon /></div>
          <h2 className="mb-1 text-2xl font-bold text-zinc-900 dark:text-white">Session Complete</h2>
          <p className="mb-8 text-sm text-zinc-400 dark:text-zinc-500"><span className="font-mono font-semibold">{stats.calls}</span> calls made</p>
          <div className="grid grid-cols-3 gap-3">
            {sc.map(s => (
              <div key={s.label} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
                <p className="font-mono text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex items-center justify-center gap-3">
            <button onClick={() => setView("list")} className="rounded-xl bg-[#22C55E] px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#22C55E]/25 transition-all hover:bg-[#16A34A] active:scale-[0.98]">Back to Leads</button>
            <button onClick={() => startSession()} className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-[var(--card)] hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">Dial Again</button>
          </div>
        </div>
      </div>
    );

  // ════════════════════════════════════════════════════════════════════════
  // POST-CALL VIEW
  // ════════════════════════════════════════════════════════════════════════

  } else if (view === "postcall") {
    const outcomes = [
      { key: "followup", label: "Follow Up", icon: "📞" },
      { key: "appointment", label: "Set Appointment", icon: "📅" },
      { key: "sold", label: "SOLD", icon: "🎉" },
      { key: "not_interested", label: "Not Interested", icon: "👎" },
      { key: "bad_number", label: "Bad Number", icon: "❌" },
    ];
    viewContent = (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
        <div className="absolute left-4 top-4"><ThemeToggle isDark={isDark} onToggle={toggleTheme} /></div>
        <div className="animate-fade-in-up w-full max-w-sm text-center">
          {currentLead && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[10px] text-lg font-bold text-white"
                style={{ backgroundColor: getAvatarColor(currentLead.name) }}>{getInitials(currentLead.name)}</div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{currentLead.name}</h2>
              <p className="mt-1 font-mono text-sm text-zinc-400">{formatPhone(currentLead.phone)}</p>
              <p className="mb-6 mt-1 font-mono text-sm font-semibold text-[#22C55E]">{formatDuration(callDuration)}</p>
            </>
          )}
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">What happened?</p>
          <div className="space-y-2">
            {outcomes.map(o => (
              <button key={o.key} onClick={() => handleOutcome(o.key)}
                className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3.5 text-left text-sm font-semibold text-zinc-800 shadow-sm transition-all hover:shadow-md active:scale-[0.99] dark:text-zinc-200 dark:hover:border-zinc-600">
                <span className="text-base">{o.icon}</span>{o.label}
              </button>
            ))}
          </div>
          <button onClick={advanceToNext} className="mt-5 text-sm font-medium text-zinc-400 underline-offset-4 transition-colors hover:text-zinc-600 hover:underline dark:text-zinc-500 dark:hover:text-zinc-300">Skip</button>
        </div>
      </div>
    );

  // ════════════════════════════════════════════════════════════════════════
  // CONNECTED VIEW (user tapped "Answered" — call timer running)
  // ════════════════════════════════════════════════════════════════════════

  } else if (view === "connected") {
    viewContent = (
      <div className="flex min-h-screen flex-col bg-[var(--background)]">
        <div className="absolute left-4 top-4"><ThemeToggle isDark={isDark} onToggle={toggleTheme} /></div>
        <div className="border-b border-[var(--border)] bg-[var(--card)] px-4 py-4">
          <div className="mx-auto flex max-w-2xl items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-[#22C55E]" />
              </span>
              {currentLead && (
                <div>
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">{currentLead.name}</span>
                  <span className="ml-2 text-xs text-zinc-400 dark:text-zinc-500">
                    {[currentLead.age ? `Age ${currentLead.age}` : null, currentLead.state].filter(Boolean).join(" · ")}
                  </span>
                </div>
              )}
            </div>
            <span className="font-mono text-lg font-bold text-[#22C55E]">{formatDuration(callDuration)}</span>
          </div>
        </div>
        <div className="border-b border-[var(--border)] bg-[var(--background)] px-4 py-3">
          <div className="mx-auto flex max-w-2xl items-center justify-center gap-4">
            {[{ label: "Calls", value: stats.calls }, { label: "VMs", value: stats.voicemails }, { label: "Appts", value: stats.appointments }, { label: "Sold", value: stats.sold }].map(s => (
              <div key={s.label} className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{s.label}</span>
                <span className="font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="border-b border-[var(--border)] bg-[var(--background)] px-4 py-3">
          <div className="mx-auto flex max-w-2xl items-center justify-center gap-3">
            <button onClick={endCall} className="flex items-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-600 active:scale-[0.98]"><PhoneOffIcon /> End Call</button>
            <button onClick={handleStop} className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-[var(--card)] dark:text-zinc-400"><StopIcon /> Stop</button>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500">Sales script will appear here</p>
            <p className="mt-1 text-xs text-zinc-300 dark:text-zinc-600">On a live call — tap End Call when done</p>
          </div>
        </div>
      </div>
    );

  // ════════════════════════════════════════════════════════════════════════
  // DIALING VIEW (tel: link opens phone dialer, user picks outcome)
  // ════════════════════════════════════════════════════════════════════════

  } else if (view === "dialing") {
    const cw = currentLead ? getCallWindow(currentLead.state) : null;
    const progress = dialQueue.length > 0 ? ((queueIndex + 1) / dialQueue.length) * 100 : 0;

    viewContent = (
      <div className="flex min-h-screen flex-col bg-[var(--background)]">
        <div className="absolute left-4 top-4 z-50"><ThemeToggle isDark={isDark} onToggle={toggleTheme} /></div>

        {/* Progress bar */}
        <div className="border-b border-[var(--border)] bg-[var(--card)] px-4 pt-14 pb-4">
          <div className="mx-auto max-w-md">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-zinc-500 dark:text-zinc-400">{queueIndex + 1}/{dialQueue.length}</span>
              <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                {stats.appointments > 0 && <span className="text-[#22C55E]">{stats.appointments} appt{stats.appointments !== 1 ? "s" : ""}</span>}
                {stats.sold > 0 && <span className="ml-2 text-[#22C55E]">{stats.sold} sold</span>}
                {stats.voicemails > 0 && <span className="ml-2 text-[#EAB308]">{stats.voicemails} VM{stats.voicemails !== 1 ? "s" : ""}</span>}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div className="h-full rounded-full bg-[#22C55E] transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {/* Center content */}
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          {currentLead && (
            <div className="animate-fade-in-up flex flex-col items-center text-center" key={currentLead.id}>
              <div className={`mb-6 flex h-20 w-20 items-center justify-center rounded-[14px] text-xl font-bold text-white ${!sessionPaused && !dialed ? "animate-dial-pulse" : ""}`}
                style={{ backgroundColor: getAvatarColor(currentLead.name) }}>{getInitials(currentLead.name)}</div>

              <p className={`mb-3 font-mono text-xs font-bold uppercase tracking-[0.25em] ${
                sessionPaused ? "text-[#EAB308]" : dialed ? "text-[#22C55E]" : "text-[#22C55E]"
              }`}>
                {sessionPaused ? "PAUSED" : dialed ? "ON CALL" : "DIALING"}
              </p>

              {autoAdvancing && !sessionPaused && (
                <>
                  <div className="mb-3 h-1 w-40 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <div className="animate-countdown h-full rounded-full bg-[#22C55E]" />
                  </div>
                  <p className="mb-3 text-[10px] font-medium text-zinc-400 dark:text-zinc-500">auto-advancing…</p>
                </>
              )}

              <h2 className="mb-1 text-[32px] font-black leading-tight text-zinc-900 dark:text-white">{currentLead.name}</h2>
              <p className="mb-1 font-mono text-sm text-zinc-400">{formatPhone(currentLead.phone)}</p>
              <p className="mb-6 text-xs text-zinc-400 dark:text-zinc-500">
                {[currentLead.age ? `Age ${currentLead.age}` : null, currentLead.state || null, cw ? cw.label : null].filter(Boolean).join(" · ")}
              </p>

              {/* Dial button */}
              {!autoAdvancing && (
                <button onClick={() => { openDialer(currentLead.phone); setDialed(true); }}
                  className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#22C55E] text-white shadow-lg shadow-[#22C55E]/25 transition-all hover:bg-[#16A34A] active:scale-95">
                  <PhoneIcon />
                </button>
              )}

              {/* Outcome buttons — visible once dialed */}
              {dialed && !autoAdvancing && !sessionPaused && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button onClick={handleDialVM}
                    className="rounded-xl bg-[#EAB308]/10 px-4 py-2.5 text-xs font-bold text-[#EAB308] transition-colors hover:bg-[#EAB308]/20">
                    Left VM
                  </button>
                  <button onClick={handleDialAnswered}
                    className="rounded-xl bg-[#22C55E]/10 px-4 py-2.5 text-xs font-bold text-[#22C55E] transition-colors hover:bg-[#22C55E]/20">
                    Answered
                  </button>
                  <button onClick={handleDialNoAnswer}
                    className="rounded-xl bg-zinc-500/10 px-4 py-2.5 text-xs font-bold text-zinc-500 transition-colors hover:bg-zinc-500/20 dark:text-zinc-400">
                    No Answer
                  </button>
                  <button onClick={handleDialBadNumber}
                    className="rounded-xl bg-[#EF4444]/10 px-4 py-2.5 text-xs font-bold text-[#EF4444] transition-colors hover:bg-[#EF4444]/20">
                    Bad #
                  </button>
                </div>
              )}

              {sessionPaused && (
                <button onClick={handlePauseResume}
                  className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#22C55E] text-white shadow-lg shadow-[#22C55E]/25 transition-all hover:bg-[#16A34A] active:scale-95">
                  <PlayIcon />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <div className="border-t border-[var(--border)] bg-[var(--card)] px-4 py-4">
          <div className="mx-auto flex max-w-md items-center justify-between">
            <button onClick={handlePrev} disabled={queueIndex === 0}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent dark:text-zinc-400 dark:hover:bg-zinc-800">
              <ChevronLeftIcon /> Prev
            </button>
            <button onClick={handleSkip}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800">
              Skip <SkipForwardIcon />
            </button>
            <button onClick={handlePauseResume}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800">
              {sessionPaused ? <><PlayIcon /> Resume</> : <><PauseIcon /> Pause</>}
            </button>
            <button onClick={handleStop}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10">
              <StopIcon /> Stop
            </button>
          </div>
        </div>
      </div>
    );

  // ════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ════════════════════════════════════════════════════════════════════════

  } else {
    viewContent = (
      <div className="flex min-h-screen flex-col bg-[var(--background)]">
        <div className="fixed left-4 top-4 z-50"><ThemeToggle isDark={isDark} onToggle={toggleTheme} /></div>
        <div className="fixed right-4 top-4 z-50">
          <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Personal Line</span>
          </div>
        </div>

        <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-xl">
          <div className="mx-auto max-w-2xl px-4 pb-4 pt-14">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-[#1C1C1C]"><BoltIcon size={16} /></div>
              <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">SkipDial</h1>
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 font-mono text-xs font-medium text-zinc-500 dark:bg-[#252525] dark:text-zinc-400">{leads.length}</span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button onClick={() => startSession()}
                className="flex items-center gap-2 rounded-xl bg-[#22C55E] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#22C55E]/25 transition-all hover:bg-[#16A34A] hover:shadow-md hover:shadow-[#22C55E]/30 active:scale-[0.98]">
                <PlayIcon /> Power Dial {dialableCount} leads
              </button>
              <button onClick={handleNewList}
                className="rounded-xl border border-[var(--border)] bg-transparent px-4 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-[var(--card)] hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">New list</button>
            </div>
            <div className="relative mt-4">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"><SearchIcon /></div>
              <input type="text" placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] py-2.5 pl-10 pr-4 text-sm text-zinc-800 placeholder-zinc-400 outline-none transition-colors focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 dark:text-zinc-200 dark:placeholder-zinc-500" />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-4">
          <div className="mx-auto max-w-2xl space-y-2">
            {filteredLeads.map(lead => {
              const cw = getCallWindow(lead.state);
              return (
                <button key={lead.id} onClick={() => startSession(lead.id)}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-left shadow-sm transition-all hover:shadow-md dark:hover:border-zinc-600">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-sm font-bold text-white"
                    style={{ backgroundColor: getAvatarColor(lead.name) }}>{getInitials(lead.name)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{lead.name}</p>
                    <p className="mt-0.5 truncate text-xs text-zinc-400 dark:text-zinc-500">
                      {[lead.age ? `Age ${lead.age}` : null, lead.state || null, lead.phone ? formatPhone(lead.phone) : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    {lead.state && <span className="font-mono text-xs font-medium" style={{ color: cw.color }}>{cw.time}</span>}
                    <StatusBadge status={lead.status} isDark={isDark} />
                  </div>
                </button>
              );
            })}
            {filteredLeads.length === 0 && (
              <div className="flex flex-col items-center py-20">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-300 dark:bg-[#252525] dark:text-zinc-600"><SearchIcon /></div>
                <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500">{search ? "No leads match your search" : "No leads loaded"}</p>
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

  // ════════════════════════════════════════════════════════════════════════
  // RENDER WRAPPER
  // ════════════════════════════════════════════════════════════════════════

  return (
    <>
      {viewContent}
      {toast && (
        <div className="animate-toast-enter fixed bottom-6 left-1/2 z-[100] -translate-x-1/2">
          <div className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg dark:bg-white dark:text-zinc-900">{toast}</div>
        </div>
      )}
    </>
  );
}
