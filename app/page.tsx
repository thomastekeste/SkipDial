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

type View = "upload" | "list" | "dialing" | "script" | "postcall" | "summary";

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
function FileTextIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>;
}
function ChevronDownIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>;
}
function XIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
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
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["intro"]));

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

  // ── Initialization (theme + persisted leads) ────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("skipdial-theme");
    const dark = stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);

    const savedLeads = localStorage.getItem("skipdial-leads");
    if (savedLeads) {
      try {
        const parsed = JSON.parse(savedLeads) as Lead[];
        if (parsed.length > 0) { setLeads(parsed); setView("list"); }
      } catch { /* corrupt data, ignore */ }
    }

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

  // ── Persist leads to localStorage ────────────────────────────────────────
  useEffect(() => {
    if (!mounted) return;
    if (leads.length > 0) {
      localStorage.setItem("skipdial-leads", JSON.stringify(leads));
    }
  }, [leads, mounted]);

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

  // ── Call duration timer (unused — script is read-only) ──────────────────

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
  const handleNewList = useCallback(() => { localStorage.removeItem("skipdial-leads"); setLeads([]); setSearch(""); setView("upload"); }, []);

  // ── Session controls ────────────────────────────────────────────────────

  const startSession = useCallback((startLeadId?: number) => {
    const queue = leads
      .filter((l) => getCallWindow(l.state).score > 0 && !SKIPPED_STATUSES.has(l.status))
      .sort((a, b) => {
        const aNew = a.status === "NEW LEAD" ? 0 : 1;
        const bNew = b.status === "NEW LEAD" ? 0 : 1;
        if (aNew !== bNew) return aNew - bNew;
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

  const handleOpenScript = useCallback(() => {
    if (!currentLead) return;
    setOpenSections(new Set(["intro"]));
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
      const aNew = a.status === "NEW LEAD" ? 1 : 0;
      const bNew = b.status === "NEW LEAD" ? 1 : 0;
      if (aNew !== bNew) return aNew - bNew;
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
      { key: "followup", label: "Follow Up" },
      { key: "appointment", label: "Set Appointment" },
      { key: "sold", label: "SOLD" },
      { key: "not_interested", label: "Not Interested" },
      { key: "bad_number", label: "Bad Number" },
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
              <p className="mb-6 mt-1 font-mono text-sm text-zinc-400">{formatPhone(currentLead.phone)}</p>
            </>
          )}
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">What happened?</p>
          <div className="space-y-2">
            {outcomes.map(o => (
              <button key={o.key} onClick={() => handleOutcome(o.key)}
                className="flex w-full items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3.5 text-left text-sm font-semibold text-zinc-800 shadow-sm transition-all hover:shadow-md active:scale-[0.99] dark:text-zinc-200 dark:hover:border-zinc-600">
                {o.label}
              </button>
            ))}
          </div>
          <button onClick={advanceToNext} className="mt-5 text-sm font-medium text-zinc-400 underline-offset-4 transition-colors hover:text-zinc-600 hover:underline dark:text-zinc-500 dark:hover:text-zinc-300">Skip</button>
        </div>
      </div>
    );

  // ════════════════════════════════════════════════════════════════════════
  // SCRIPT VIEW (user tapped "Script" — VET script with call timer)
  // ════════════════════════════════════════════════════════════════════════

  } else if (view === "script") {
    const firstName = currentLead ? currentLead.name.split(" ")[0] : "___";
    const leadDob = currentLead?.dob || "___";
    const leadState = currentLead?.state || "___";

    const toggleSection = (id: string) => {
      setOpenSections(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    };

    const S = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <button onClick={() => toggleSection(id)}
          className="flex w-full items-center justify-between px-4 py-3 text-left">
          <span className="text-sm font-bold text-zinc-900 dark:text-white">{title}</span>
          <span className={`text-zinc-400 transition-transform ${openSections.has(id) ? "rotate-180" : ""}`}><ChevronDownIcon /></span>
        </button>
        {openSections.has(id) && (
          <div className="border-t border-[var(--border)] px-4 py-3 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            {children}
          </div>
        )}
      </div>
    );

    const Agent = ({ children }: { children: React.ReactNode }) => (
      <p className="my-1 text-xs italic text-red-400 dark:text-red-400/80">{children}</p>
    );
    const Gold = ({ children }: { children: React.ReactNode }) => (
      <p className="my-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-600 dark:text-amber-400">{children}</p>
    );
    const Blue = ({ children }: { children: React.ReactNode }) => (
      <p className="my-1 text-[13px] text-blue-500 dark:text-blue-400">{children}</p>
    );
    const H = ({ children }: { children: React.ReactNode }) => (
      <p className="mb-1 mt-3 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{children}</p>
    );
    const B = ({ children }: { children: React.ReactNode }) => (
      <p className="my-1 pl-3 text-[13px] text-zinc-700 dark:text-zinc-300">• {children}</p>
    );

    viewContent = (
      <div className="flex min-h-screen flex-col bg-[var(--background)]">
        {/* Sticky top bar */}
        <div className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--card)]">
          <div className="px-4 py-3">
            <div className="mx-auto flex max-w-2xl items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setView("dialing")}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200">
                  <XIcon />
                </button>
                {currentLead && (
                  <div>
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">{currentLead.name}</span>
                    <span className="ml-2 text-xs text-zinc-400 dark:text-zinc-500">
                      {[currentLead.age ? `Age ${currentLead.age}` : null, currentLead.state].filter(Boolean).join(" · ")}
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
                {[{ label: "Calls", value: stats.calls }, { label: "VMs", value: stats.voicemails }, { label: "Appts", value: stats.appointments }, { label: "Sold", value: stats.sold }].map(s => (
                  <div key={s.label} className="flex items-center gap-1 text-[10px]">
                    <span className="font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{s.label}</span>
                    <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">{s.value}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={endCall} className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-red-600 active:scale-[0.98]"><PhoneOffIcon /> End</button>
                <button onClick={handleStop} className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"><StopIcon /></button>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable script body */}
        <main className="flex-1 overflow-y-auto px-4 py-4">
          <div className="mx-auto max-w-2xl space-y-3">

            <S id="intro" title="INTRO">
              <p>Hey <strong>{firstName}</strong>, this is <span className="text-amber-500">(your first name)</span> with the Veterans Benefits Office. You doing alright today?</p>
              <p className="mt-2">Okay perfect, I was just giving you a call in regards to the Final Expense and Life options for Veterans. Just to confirm I&apos;ve got your DOB listed here as <strong>{leadDob}</strong>. Is that Correct?</p>
              <p className="mt-2">And you&apos;re still in the state of <strong>{leadState}</strong> Correct?</p>
              <p className="mt-2">It shows on my side your main concern was like most veterans just wanting to make sure that the Funeral Expense doesn&apos;t fall a burden on your loved ones Correct?</p>
            </S>

            <S id="objections" title="INTRO OBJECTIONS">
              <H>You are the 10th person that has called me!</H>
              <Blue>I completely understand, but it doesn&apos;t look like anyone has contacted you from our office. It must have been a telemarketer from India or something. Then go back to the script…</Blue>

              <H>I already have coverage in place!</H>
              <Blue>Perfect, that makes my job a whole lot easier.. Did you get that in place with the Veteran benefit office or Private carrier?....Okay and was it more recently or has it been a few years?...How much are you covered for and what do they have you paying each month?</Blue>
              <Agent>IF MORE THAN 50K assume term/accidental… Assume small whole life. Check to see if you can beat the rate!</Agent>
              <Blue>(REPLACE) Are you sick, do you have cancer, AIDS? That carrier usually has people on 2 to 5 year waiting periods, and has people paying sick rates.</Blue>
              <Agent>IF YOU CAN&apos;T BEAT CURRENT RATE OR PAID UP FUNERAL — PIVOT TO ADDING</Agent>
              <Blue>Looks like they got you a good rate when you were still young. Now was that coverage for a burial or cremation? Gotcha, You were just looking to make sure to take care of any residual expenses that come up. Right?</Blue>
              <Agent>Spend their coverage.. High funeral costs, Mortgage, income, Debts, I love you money</Agent>

              <H>I don&apos;t remember filling this out!</H>
              <Blue>Perfect, I usually don&apos;t remember what I eat for breakfast most days. You put your date of birth as <strong>{leadDob}</strong> correct? Now, most people&apos;s main concern when they fill this out is to make sure that their final expense doesn&apos;t fall a burden on their loved ones that would be the same for you right?</Blue>

              <H>I&apos;m not interested!</H>
              <Blue>I completely understand, when you sent this request in, what was your main concern? Do you have any coverage currently in place to pay for your burial or cremation? If yes: Perfect, when you sent this in were you just trying to save some money with the new discounted programs or add more coverage?</Blue>

              <H>This is not a good time or I&apos;m busy!</H>
              <Blue><strong>{firstName}</strong>, perfect we are really backed up too! I&apos;ll make this quick for you. You put your date of birth as <strong>{leadDob}</strong> correct?</Blue>

              <H>VA will take care of my burial</H>
              <Blue>I completely understand, but that&apos;s actually a common misconception that veterans get buried for free. I wish that was the case.. If it was up to me all veterans should get put to rest at no cost! But unfortunately, too many veterans actually don&apos;t know what the VA covers for them when they pass away. The VA just covers your plot but your loved ones would be responsible for your burial/cremation. That being said, god forbid something happened to you today, who would be responsible for the funeral expenses and picking up all the pieces tomorrow?</Blue>
            </S>

            <S id="why" title="DIG INTO WHY">
              <Gold>Now god forbid, if you were to pass away today who would be the beneficiary responsible paying for the funeral expenses?</Gold>
              <B>What is their name? Okay and can you spell that for me?</B>
              <B>Is (beneficiary name) in a financial position to cover a funeral expense or is that why you were looking into this?</B>
              <Blue>If Yes: I completely understand, you were just wanting to make sure (beneficiary) didn&apos;t have to dig into their savings or come out of pocket for the expense, correct?</Blue>
              <p className="mt-2">I completely understand, that&apos;s why most veterans send in these requests. So their loved ones aren&apos;t burdened with that expense.</p>
              <p className="mt-2">Have you thought about whether you were to be buried or cremated?</p>
              <p className="mt-2">Do you know how much that costs nowadays?!</p>
              <B>Cremation: 5-7k depending on the celebration/urn.</B>
              <B>Burial: 12-20k depending on the fanciness of the service &amp; the opening/closing.</B>
              <p className="mt-2">Do you have anything put aside somewhere in a significant savings or do you have a policy that would cover that cost God Forbid something were to happen to you today?</p>
              <Agent>ONLY IF YES: Okay, and you said you wanted (Beneficiary) to be left with a check..not a bill, right?</Agent>
              <Agent>ONLY IF NO: Okay, and you said coming out of pocket for that expense would be pretty tough on (Beneficiary)?</Agent>
              <Gold>So since you don&apos;t have anything as of today, your goal is to put your family in a situation where you don&apos;t leave a financial burden behind when you do pass away, correct?</Gold>
            </S>

            <S id="suitability" title="CLIENT SUITABILITY">
              <p>So what we&apos;ll do is spend about a minute or so on yourself and your financial situation to make sure everything is affordable and within the budget. Then we&apos;ll spend about 2 minutes on your health.. and that&apos;s just gonna help me navigate which one of the 26 VA A rated carriers we need to apply for today ok.</p>

              <H>Income</H>
              <B>Now are you currently working, retired, or disabled?</B>
              <Agent>IF retired: I can&apos;t wait to say that one day! / IF disabled: Bless your heart!</Agent>
              <B>What would you say you bring in per month just to the ballpark?</B>
              <B>At the end of month once you pay all your bills, utilities, and all the fun things you like to do. How much would you say you are typically left with?</B>
              <Agent>Little to No Income ($200 or under):</Agent>
              <Blue>I completely understand, so that being said, what would be a comfortable amount that you would be comfortable allocating into something like this every month to protect your loved ones?</Blue>
              <Agent>Push Back: Do you mind if I make a recommendation..</Agent>
              <Blue>I would say some coverage is better than no coverage to alleviate that financial burden. So we can always start with the lowest option available then increase when times get better. If you can&apos;t afford $50-$75/mo how do you expect (Beneficiary) to afford that entire funeral expense.. Does that make sense?</Blue>
              <Agent>Income Objection: Why do you need to know that?</Agent>
              <Blue>Well <strong>{firstName}</strong>, there are guidelines I have to abide by in regards to making sure whichever option you choose is gonna be affordable for you based on your income. Sometimes our hearts are bigger than our budgets. Don&apos;t worry, I&apos;m here to help you not hurt you!</Blue>

              <H>Discounts</H>
              <B>Are you a smoker or Nonsmoker?</B>
              <Agent>If smoker: Do you plan on quitting anytime soon over the next couple years? Yes → AMERICO</Agent>
              <B>Do you bank with a military branch credit union or a state or federal bank like Chase or Wells Fargo?</B>
              <Agent>Note the name of the financial institution.</Agent>

              <H>Health</H>
              <B>For all of your medical needs do you go to the VA or a civilian doctor? Are all prescriptions through the VA or civilian?</B>
              <B>Any complaints on your behalf?</B>
              <B>Any heart attacks, heart failure, strokes, TIA, or stents in the last 5 yrs?</B>
              <Agent>If yes: Blood thinners (Plavix/warfarin)? Heart meds (Nitrostat, nitroglycerin, eliquis)?</Agent>
              <B>Any cancer in the last 5 years? What kind? How long in remission?</B>
              <B>Any diabetes? If yes: metformin or insulin?</B>
              <B>Any neuropathy? If yes: gabapentin?</B>
              <B>Any breathing complications, COPD? If yes: oxygen or inhaler?</B>
              <B>Any kidney or liver problems? If yes: kidney failure/disorder or dialysis?</B>
              <B>Rough height and weight?</B>
              <Agent>Bear with me for 1 minute. I&apos;m going to run this information through all the different carriers in the entire country and see which one is going to give us the cheapest rate, and then we&apos;ll apply for that one Ok.</Agent>
            </S>

            <S id="benefits" title="BENEFITS">
              <p className="mb-2">Go ahead and grab a Pen/Paper for me.</p>
              <H>Build Trust</H>
              <p>Now go ahead and write down my name and my number since I will be taking care of you and (beneficiary) Today.</p>
              <p className="mt-2">I&apos;m gonna give you some information about the benefits that come with this type of plan specifically for Veterans.</p>
              <B><strong>Immediate coverage:</strong> As soon as you make your first premium you&apos;re covered day 1, no 2 year wait period like most carriers!</B>
              <B><strong>Locked in:</strong> Premium never increases and coverage never decreases!</B>
              <B><strong>TAX-FREE:</strong> The death benefit, living benefit, and cash value are one of the few things we don&apos;t have to pay Uncle Sam for!</B>
              <B><strong>Living benefit:</strong> IF you get a terminal illness, and the doctor tells you that you have 12-24 months to live you&apos;ll have access to 50% of the benefit tax free while you&apos;re still living!</B>
              <B><strong>Double Accidental PayOut:</strong> If your cause of death is choke, drown, slip, fall, or die in a car accident your coverage would double.</B>
              <B><strong>Permanent coverage:</strong> This coverage will never expire on you.. it is a whole life policy.</B>
            </S>

            <S id="quote" title="QUOTE — BRONZE / SILVER / GOLD">
              <p>Based on what you&apos;ve told me the system has built 3 packages of coverage and you can decide on which option makes the most sense. Now Write down BRONZE, SILVER, AND GOLD….</p>
              <H>Bronze</H>
              <p>Will cover a full funeral expense and make sure (Beneficiary) won&apos;t have to come out of pocket for your funeral…. That will be (Coverage Amount) with your veterans discount that would be only _____/month.</p>
              <H>Silver</H>
              <p>Will leave a little bit extra behind to cover any left over bills…. help with inflation…. or even leave a few extra thousands behind for (Beneficiary)…. That will be (Coverage Amount) with your veterans discount that would be only _____/month.</p>
              <H>Gold</H>
              <p>That&apos;s going to cover all of the above, the funeral expense, left over bills, help with inflation and on top of that leave a nice financial cushion/legacy behind for (Beneficiary) to live on for a few years once you pass. That will be (Coverage Amount) with your veterans discount that would only be _____/month.</p>
              <Gold>Now {firstName}, which one of those best fits what you&apos;re looking to put in place for (Beneficiary)?</Gold>
              <Agent>If picking the cheapest: Awesome. Any particular reason you chose that one vs the silver or gold? I ask because most veterans usually go with the silver or gold because of inflation.</Agent>
            </S>

            <S id="close-objections" title="CLOSING OBJECTIONS">
              <H>I need to think about it</H>
              <Blue>I completely understand, you definitely need to think about it. When you say you need to think about it.. are you thinking about if you should even get the coverage at all or which coverage amount you should go with?</Blue>
              <Agent>If which one: Let&apos;s start with bare minimum, make sure you can get the approval and foot in the door. Then we can always increase it in the future. Does that make sense?</Agent>
              <Agent>If don&apos;t need: spin back on why, did they have any insurance? Or any money saved up?</Agent>

              <H>I need to talk to my wife about this!</H>
              <Blue>Push Back 1: I completely understand. She is the beneficiary of the plan, and she has to know what&apos;s going on. You can&apos;t keep this a secret that&apos;s for sure. Do you need to talk to her about which one to go with or if you should even do this because you said that this was to protect her, correct?</Blue>
              <Blue>Push Back 2: <strong>{firstName}</strong>, do you mind if I make a recommendation? Now, we can both agree that accidents can occur at any time, correct? Now if something happened to you while driving on the way home tomorrow.. And you had put this protection in place for your wife on possibly her worst day. Do you think that she would be mad at you?</Blue>

              <H>I&apos;m just shopping around today!</H>
              <Blue>I completely understand, even if you wanted to buy it today I couldn&apos;t give it to you. Like I mentioned the way that this coverage works it&apos;s not like going to the store where we can just see it and buy it. We do have to get approved for this. I punched everything into the state system and this is the lowest one with the states discount, if this one declines you the next cheapest one is a few dollars more.</Blue>
            </S>

            <S id="application" title="START APPLICATION">
              <p>Perfect, now we&apos;ll send in a request for coverage and hope to get the approval, now if they decline you we&apos;ll go to the next lowest option. Keep in mind they don&apos;t approve everyone but I will do my best to get you the coverage ok.</p>
              <Gold>Now, is this something you&apos;ve been thinking about for awhile?</Gold>

              <H>First Page</H>
              <B>Confirm spelling first/last name</B>
              <B>Height/weight</B>
              <B>Mailing address (house or apartment?)</B>
              <B>Phone number on file</B>
              <B>Email on file</B>
              <B>State you were born in?</B>
              <B>City you were born in?</B>
              <B>Obviously, you are a US Citizen!</B>
              <B>And, your social <strong>{firstName}</strong>?</B>
              <Agent>Repeat It Back.</Agent>

              <H>SSN Objection</H>
              <Blue>Push Back #1: I completely understand, now the main reason they ask for that is so that they can run the medical background check and actually get you approved for the cheapest coverage, and number two that&apos;s going to be the only thing linked to your death certificate so they can actually pay (Beneficiary) God forbid something happens to you. Does that make sense?</Blue>
              <Blue>Push Back #2: No worries, Go ahead and confirm the last four.</Blue>

              <H>Health Filler Questions</H>
              <B>Do you use anything to help you walk around? Cane, wheelchair, scooter?</B>
              <B>Any oxygen equipment to help you breathe?</B>
              <B>Any help with daily activities? Eating, bathing, toileting, dressing?</B>
              <B>Any COVID-19 in the last 90 days?</B>
              <B>Any alcohol or drug abuse in your past?</B>
              <B>Any Alzheimers or Dementia?</B>
              <B>Any AIDS or HIV?</B>
              <B>Any hepatitis?</B>
              <B>Any Brain tumor or brain aneurysm?</B>
              <B>Any dangerous activities planned in the next two years? Bungee jumping, skydiving, rock climbing?</B>

              <H>Beneficiary — Build the Emotion</H>
              <B>Confirm beneficiary from earlier..</B>
              <B>Confirm spelling of name, relationship, and DOB</B>
              <B>Confirm the % of death benefit they will receive.</B>
              <B>If spouse ask if they want a &quot;back up&quot; or &quot;contingent&quot; beneficiary</B>
              <Agent>SPOUSE: How long have you been married for? Any tips for me? Any grandkids?</Agent>
              <Agent>CHILD: Awesome, do you see them often? What do you all like to do? Any grandkids?</Agent>
              <Gold>Got it; if you don&apos;t mind me asking, what really got you thinking into getting something like this in place for (beneficiary)?</Gold>
              <Agent>LET THEM TALK</Agent>
            </S>

            <S id="billing" title="BILLING & PAYMENT">
              <p>Hey <strong>{firstName}</strong>… the next part here is the state&apos;s anti money laundering verification portion… Most veterans like for their policy to start when they receive their benefits… What day is that for you?</p>
              <Agent>1st, 3rd of the month, or 2nd/3rd/4th Wednesday of the month are the only payment dates you should set</Agent>
              <B>Is your name spelled the same way with your bank? Or do you use a middle initial?</B>
              <B>Ok, and you wanted to list (Name of bank) correct?</B>
              <B>Ok, and is that a checking or a savings?</B>
              <B>Perfect, and it looks like we are partnered with (Name of bank)?</B>
              <Agent>9/10 times the routing number that automates is correct. Go ahead and grab a checkbook to confirm it. Read it off to them. And the account #? Make them repeat it twice.</Agent>

              <H>No Checkbook</H>
              <Blue>Do you get your statements via mail or email? I&apos;m guessing you have the app on your phone, right? No worries, we can just add the debit card on file for now and update it later.</Blue>
              <Agent>Ask if Visa or Mastercard, card number, expiration month/yr, 3 digit CVV on back. MAKE THEM REPEAT IT TWICE.</Agent>

              <H>Bank Objection</H>
              <Blue>Push Back #1: I completely understand, now quick question <strong>{firstName}</strong>: have you ever given or received a check from anyone in your lifetime? Perfect, if you notice at the bottom of every check you&apos;ll see the bank&apos;s routing and account number because that information can&apos;t be used to buy something online or go to your local Walmart and go on a shopping spree OK? What would be weird is if I would&apos;ve asked you for something like a debit/credit card which is an unsecured payment method. Does that make sense?</Blue>
              <Blue>Push Back #2: I completely understand, so the state is required by law to validate that information provided is linked to your name for your safety and the safety of others. Do you receive text messages to this phone? I&apos;m gonna send you a picture of my screen for further transparency.</Blue>
            </S>

            <S id="close" title="CLOSE & REFERRALS">
              <p>So <strong>{firstName}</strong>, everything is fully submitted at this point. Couple things to recap, the coverage we applied for was for XXX and the name of the insurance carrier is XXX.</p>
              <p className="mt-2">Also, this number we are talking on, this is my direct line, it&apos;s the same number my mom calls me on. Anything you ever need in regards to this coverage, I&apos;m always the first person you can reach out to, I&apos;m just a phone call or text away ok.</p>
              <p className="mt-2">Lastly, this is important, we always contact the department of insurance in the state and let them know that we have completed the request and submitted an application. The reason we do that is because it should remove you from any kind of lists of solicitations about this coverage. No one will ever contact you about this coverage other than myself or the carrier asking you for any personal information ok.</p>
              <p className="mt-2">But with the internet these days you will still probably get some calls but none will be anything in regard to what we did. So if they say they&apos;re my manager, it&apos;s incomplete, due for review, etc it&apos;s just a line of crap from some telemarketer trying to pull a fast one on you ok.</p>

              <H>Referrals</H>
              <p>Also, my digital card will be in that text if you want to save it or send it around. We currently have a referral program which is a $50 VISA referral fee for each person that gets approved for a policy and makes their first premium. Could you think of one or two people who&apos;d benefit from a simple chat about their coverage options? It&apos;d mean a lot to ensure they&apos;re not left unprotected. If so, just make sure they mention your name!</p>
              <p className="mt-2">One last thing.. Are there any questions or concerns I may have left unanswered? I appreciate you allowing me to serve you. Have a blessed rest of your day!</p>
              <Agent>Disposition as SOLD on RINGY</Agent>
            </S>

          </div>
        </main>
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
                  <button onClick={handleOpenScript}
                    className="flex items-center gap-1.5 rounded-xl bg-[#22C55E]/10 px-4 py-2.5 text-xs font-bold text-[#22C55E] transition-colors hover:bg-[#22C55E]/20">
                    <FileTextIcon /> Script
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
