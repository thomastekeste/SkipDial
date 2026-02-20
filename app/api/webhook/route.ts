import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = supabaseAdmin();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const clerkUserId = session.metadata?.clerkUserId;
      if (clerkUserId && session.subscription && session.customer) {
        await db
          .from("users")
          .update({
            stripe_customer_id: session.customer as string,
            subscription_id: session.subscription as string,
            subscription_status: "active",
            plan: "solo",
            updated_at: new Date().toISOString(),
          })
          .eq("id", clerkUserId);
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const clerkUserId = sub.metadata?.clerkUserId;
      if (clerkUserId) {
        await db
          .from("users")
          .update({
            subscription_status: sub.status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", clerkUserId);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const clerkUserId = sub.metadata?.clerkUserId;
      if (clerkUserId) {
        await db
          .from("users")
          .update({
            subscription_status: "canceled",
            plan: "none",
            updated_at: new Date().toISOString(),
          })
          .eq("id", clerkUserId);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
