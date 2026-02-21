import type { Lead } from "./types";
import { STATE_UTC_OFFSETS, NO_DST_STATES, AVATAR_COLORS, DEMO_LEADS_RAW } from "./constants";

// ─── DST ─────────────────────────────────────────────────────────────────────
// US DST: second Sunday of March 2 AM ET → first Sunday of November 2 AM ET

export function isDST(): boolean {
  const now = new Date();
  const year = now.getUTCFullYear();

  const mar1 = new Date(Date.UTC(year, 2, 1));
  const secondSunMar = 8 + ((7 - mar1.getUTCDay()) % 7);
  const dstStart = Date.UTC(year, 2, secondSunMar, 7); // 2 AM ET = 7 AM UTC

  const nov1 = new Date(Date.UTC(year, 10, 1));
  const firstSunNov = 1 + ((7 - nov1.getUTCDay()) % 7);
  const dstEnd = Date.UTC(year, 10, firstSunNov, 6); // 2 AM EDT = 6 AM UTC

  const ts = now.getTime();
  return ts >= dstStart && ts < dstEnd;
}

export function getLocalHour(state: string): number | null {
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

export function getCallWindow(state: string): { label: string; score: number; time: string; color: string } {
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

// ─── Formatting ──────────────────────────────────────────────────────────────

export function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  const c = d.startsWith("1") && d.length === 11 ? d.slice(1) : d;
  if (c.length === 10) return `(${c.slice(0, 3)}) ${c.slice(3, 6)}-${c.slice(6)}`;
  return phone;
}

export function cleanPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  return d.startsWith("1") && d.length === 11 ? d.slice(1) : d;
}

export function parseAge(dob: string): number | null {
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

export function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).filter(Boolean).join("").toUpperCase().slice(0, 2);
}

export function getAvatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function openDialer(phone: string) {
  const a = document.createElement("a");
  a.href = `tel:+1${phone}`;
  a.click();
}

// ─── CSV ─────────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, string> = {
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

export function parseCSV(text: string): Lead[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const delim = lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(delim).map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
  const fc = (p: string) => headers.findIndex((h) => h.includes(p));
  const ni = fc("name"), pi = fc("phone"), di = fc("dob"), si = fc("state"), sti = fc("status"), noi = fc("note");
  if (ni === -1 || pi === -1) return [];
  const leads: Lead[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delim).map((c) => c.trim().replace(/^['"]|['"]$/g, ""));
    const name = cols[ni] || "";
    const phone = cleanPhone(cols[pi] || "");
    if (!name || phone.length < 7) continue;
    const dob = di !== -1 ? cols[di] || "" : "";
    const state = si !== -1 ? (cols[si] || "").toUpperCase() : "";
    const status = STATUS_MAP[(sti !== -1 ? cols[sti] || "" : "").toLowerCase()] || "NEW LEAD";
    const notes = noi !== -1 ? cols[noi] || "" : "";
    let vmCount = 0;
    if (status === "1x VM") vmCount = 1;
    if (status === "2x VM") vmCount = 2;
    if (status === "3x VM") vmCount = 3;
    leads.push({ id: i, name, phone, dob, age: parseAge(dob), state, status, notes, vmCount });
  }
  return leads;
}

export function buildDemoLeads(): Lead[] {
  return DEMO_LEADS_RAW.map((l, i) => ({
    id: i + 1,
    name: l.name,
    phone: cleanPhone(l.phone),
    dob: l.dob,
    age: parseAge(l.dob),
    state: l.state,
    status: l.status,
    notes: l.notes,
    vmCount: l.status.includes("VM") ? parseInt(l.status[0]) || 0 : 0,
  }));
}

// ─── Server-side lead mapping ────────────────────────────────────────────────

export function mapServerLeads(raw: Record<string, unknown>[]): Lead[] {
  return raw.map((l, i) => ({
    id: (l.id as number) || i + 1,
    name: (l.name as string) || "",
    phone: (l.phone as string) || "",
    dob: (l.dob as string) || "",
    age: (l.age as number | null) ?? null,
    state: (l.state as string) || "",
    status: (l.status as string) || "NEW LEAD",
    notes: (l.notes as string) || "",
    vmCount: (l.vm_count as number) || 0,
  }));
}
