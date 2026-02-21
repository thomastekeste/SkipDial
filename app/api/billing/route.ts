import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { customerId } = await req.json();
  if (!customerId || typeof customerId !== "string" || !customerId.startsWith("cus_")) {
    return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 });
  }

  const origin = req.headers.get("origin") || "http://localhost:3000";

  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/dashboard`,
  });

  return NextResponse.json({ url: session.url });
}
