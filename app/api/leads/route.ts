import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

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

  const { leads } = await req.json();
  if (!Array.isArray(leads) || leads.length === 0) {
    return NextResponse.json({ error: "No leads provided" }, { status: 400 });
  }

  const db = supabaseAdmin();

  await db.from("leads").delete().eq("user_id", userId);

  const rows = leads.map(
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
      name: l.name,
      phone: l.phone,
      dob: l.dob || "",
      age: l.age ?? null,
      state: l.state || "",
      status: l.status || "NEW LEAD",
      notes: l.notes || "",
      vm_count: l.vmCount || 0,
    })
  );

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
  if (!id) {
    return NextResponse.json({ error: "Missing lead id" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status !== undefined) updates.status = status;
  if (vm_count !== undefined) updates.vm_count = vm_count;
  if (notes !== undefined) updates.notes = notes;

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
