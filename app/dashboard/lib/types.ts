export interface Lead {
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

export interface ScriptSection {
  id: string;
  title: string;
  body: string;
}

export type View =
  | "upload"
  | "script-setup"
  | "list"
  | "dialing"
  | "script"
  | "postcall"
  | "summary"
  | "paywall";

export interface SessionStats {
  calls: number;
  voicemails: number;
  appointments: number;
  sold: number;
  callbacks: number;
  badNumbers: number;
  notInterested: number;
}
