import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      typescript: true,
    });
  }
  return _stripe;
}

export const PLANS = {
  solo: {
    name: "Solo",
    price: "$39",
    priceId: process.env.STRIPE_SOLO_PRICE_ID || "",
    features: [
      "Unlimited leads",
      "Power dial queue",
      "Time-zone smart sorting",
      "Built-in sales scripts",
      "Session analytics",
    ],
  },
  team: {
    name: "Team",
    price: "$29",
    priceId: process.env.STRIPE_TEAM_PRICE_ID || "",
    features: [
      "Everything in Solo",
      "Per-seat pricing",
      "Team management",
      "Shared lead lists",
      "Priority support",
    ],
  },
} as const;
