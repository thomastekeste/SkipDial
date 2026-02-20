import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data: existing } = await db
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (existing) {
    return NextResponse.json(existing);
  }

  const clerk = await currentUser();
  const email = clerk?.emailAddresses?.[0]?.emailAddress || "";

  const { data: created, error } = await db
    .from("users")
    .insert({ id: userId, email })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(created);
}
