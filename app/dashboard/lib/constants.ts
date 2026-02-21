import type { SessionStats } from "./types";

export const INITIAL_STATS: SessionStats = {
  calls: 0, voicemails: 0, appointments: 0, sold: 0,
  callbacks: 0, badNumbers: 0, notInterested: 0,
};

export const STATE_UTC_OFFSETS: Record<string, number> = {
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

export const NO_DST_STATES = new Set(["AZ", "HI"]);

export const AVATAR_COLORS = [
  "#6366F1", "#8B5CF6", "#EC4899", "#F97316",
  "#0EA5E9", "#14B8A6", "#84CC16", "#F59E0B",
];

export const STATUS_STYLES: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
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

export const SKIPPED_STATUSES = new Set(["SOLD", "Bad #", "Not Interested", "DNC", "Already Covered"]);

export const DEMO_LEADS_RAW = [
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
