import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getStripe, PLANS } from "@/lib/stripe";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan } = await req.json();
  const priceId = plan === "team" ? PLANS.team.priceId : PLANS.solo.priceId;
  if (!priceId) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const origin = req.headers.get("origin") || "http://localhost:3000";

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/dashboard`,
    metadata: { clerkUserId: userId },
    subscription_data: { metadata: { clerkUserId: userId } },
  });

  return NextResponse.json({ url: session.url });
}
