const { env } = require("../config/env");

let _stripe = null;
function getStripe() {
  if (!env.stripeSecretKey) return null;
  if (!_stripe) {
    const Stripe = require("stripe");
    _stripe = new Stripe(env.stripeSecretKey, { apiVersion: "2024-06-20" });
  }
  return _stripe;
}

// Plans SaaS
const PLANS = {
  starter:    { name: "Starter",    price_id: process.env.STRIPE_PRICE_STARTER    || null, amount: 7900  },
  pro:        { name: "Pro",        price_id: process.env.STRIPE_PRICE_PRO        || null, amount: 14900 },
  enterprise: { name: "Entreprise", price_id: process.env.STRIPE_PRICE_ENTERPRISE || null, amount: 29900 },
};

async function createCheckoutSession({ tenantId, plan, customerEmail, successUrl, cancelUrl }) {
  const stripe = getStripe();
  if (!stripe) return null;

  const planConfig = PLANS[plan] || PLANS.starter;
  const lineItem = planConfig.price_id
    ? { price: planConfig.price_id, quantity: 1 }
    : {
        price_data: {
          currency: "eur",
          product_data: { name: `Assistant IT — Plan ${planConfig.name}` },
          unit_amount: planConfig.amount,
          recurring: { interval: "month" },
        },
        quantity: 1,
      };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [lineItem],
    customer_email: customerEmail || undefined,
    metadata: { tenant_id: tenantId, plan },
    success_url: successUrl || `${process.env.APP_URL || "http://localhost:3001"}/app/?subscribed=1`,
    cancel_url: cancelUrl || `${process.env.APP_URL || "http://localhost:3001"}/app/`,
  });

  return { url: session.url, session_id: session.id };
}

async function createPortalSession({ customerId, returnUrl }) {
  const stripe = getStripe();
  if (!stripe) return null;

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl || `${process.env.APP_URL || "http://localhost:3001"}/app/`,
  });

  return { url: session.url };
}

async function handleWebhook({ rawBody, signature }) {
  const stripe = getStripe();
  if (!stripe || !env.stripeWebhookSecret) return null;

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret);
  } catch (err) {
    throw new Error(`webhook_signature_invalid: ${err.message}`);
  }

  return event;
}

function isConfigured() {
  return Boolean(env.stripeSecretKey);
}

module.exports = { createCheckoutSession, createPortalSession, handleWebhook, isConfigured, PLANS };
