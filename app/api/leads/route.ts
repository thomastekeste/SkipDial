import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const MAX_LEADS = 5000;
const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024; // 2 MB

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("leads")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: "Payload too large (max 2 MB)" }, { status: 413 });
  }

  const body = await req.json();
  const { leads } = body;

  if (!Array.isArray(leads) || leads.length === 0) {
    return NextResponse.json({ error: "No leads provided" }, { status: 400 });
  }
  if (leads.length > MAX_LEADS) {
    return NextResponse.json({ error: `Too many leads (max ${MAX_LEADS})` }, { status: 400 });
  }

  const db = supabaseAdmin();
  await db.from("leads").delete().eq("user_id", userId);

  const rows = leads
    .filter(
      (l: Record<string, unknown>) =>
        typeof l.name === "string" && l.name.trim() !== "" &&
        typeof l.phone === "string" && l.phone.trim() !== ""
    )
    .map(
      (l: {
        name: string;
        phone: string;
        dob?: string;
        age?: number | null;
        state?: string;
        status?: string;
        notes?: string;
        vmCount?: number;
      }) => ({
        user_id: userId,
        name: l.name.slice(0, 200),
        phone: l.phone.slice(0, 30),
        dob: (l.dob || "").slice(0, 20),
        age: l.age ?? null,
        state: (l.state || "").slice(0, 5),
        status: l.status || "NEW LEAD",
        notes: (l.notes || "").slice(0, 2000),
        vm_count: l.vmCount || 0,
      })
    );

  if (rows.length === 0) {
    return NextResponse.json({ error: "No valid leads after filtering" }, { status: 400 });
  }

  const { data, error } = await db.from("leads").insert(rows).select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, status, vm_count, notes } = await req.json();
  if (!id || typeof id !== "number") {
    return NextResponse.json({ error: "Missing or invalid lead id" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status !== undefined) updates.status = String(status).slice(0, 50);
  if (vm_count !== undefined) updates.vm_count = Math.max(0, Math.min(Number(vm_count) || 0, 99));
  if (notes !== undefined) updates.notes = String(notes).slice(0, 2000);

  const { error } = await db
    .from("leads")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  void req;

  const db = supabaseAdmin();
  const { error } = await db.from("leads").delete().eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
