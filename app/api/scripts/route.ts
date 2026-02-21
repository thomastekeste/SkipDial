import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const MAX_SECTIONS = 50;
const MAX_BODY_BYTES = 100 * 1024; // 100 KB

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("users")
    .select("script_json")
    .eq("id", userId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data?.script_json ?? []);
}

export async function PUT(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sections } = await req.json();
  if (!Array.isArray(sections)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (sections.length > MAX_SECTIONS) {
    return NextResponse.json({ error: `Too many sections (max ${MAX_SECTIONS})` }, { status: 400 });
  }

  const totalSize = JSON.stringify(sections).length;
  if (totalSize > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Script too large (max 100 KB)" }, { status: 413 });
  }

  const cleaned = sections.map(
    (s: { id?: string; title?: string; body?: string }) => ({
      id: String(s.id || "").slice(0, 100),
      title: String(s.title || "").slice(0, 200),
      body: String(s.body || "").slice(0, 50000),
    })
  );

  const db = supabaseAdmin();
  const { error } = await db
    .from("users")
    .update({
      script_json: cleaned,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
