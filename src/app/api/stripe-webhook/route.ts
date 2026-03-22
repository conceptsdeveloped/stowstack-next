import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from "crypto";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      resolve(salt + ":" + derived.toString("hex"));
    });
  });
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const { plan, companyName, facilityCount } = session.metadata || {};
  const customerId = session.customer as string;
  const email = session.customer_email || session.customer_details?.email;

  if (!email || !plan || !companyName) return;

  // Idempotency: check if org already exists for this customer
  const existingOrg = await db.organizations.findFirst({
    where: { stripe_customer_id: customerId },
  });
  if (existingOrg) return;

  // Generate slug
  let slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const slugExists = await db.organizations.findFirst({ where: { slug } });
  if (slugExists) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

  // Create org
  const org = await db.organizations.create({
    data: {
      name: companyName,
      slug,
      plan: plan || "launch",
      facility_limit: parseInt(facilityCount || "1"),
      subscription_status: "active",
      stripe_customer_id: customerId,
      status: "active",
    },
  });

  // Generate temp password
  const tempPassword = Math.random().toString(36).slice(2, 10);

  // Create admin user
  await db.org_users.create({
    data: {
      organization_id: org.id,
      email: email,
      name: companyName,
      role: "org_admin",
      status: "active",
      password_hash: await hashPassword(tempPassword),
    },
  });

  // Log activity
  await db.activity_log.create({
    data: {
      type: "org_created",
      lead_name: companyName,
      detail: `New ${plan} subscription for ${companyName}`,
      meta: { plan, email, facilityCount },
    },
  });

  // Set signupComplete flag on Stripe customer so checkout-success can proceed
  try {
    await stripe.customers.update(customerId, {
      metadata: {
        signupComplete: "true",
        orgSlug: org.slug,
        tempPassword,
      },
    });
  } catch {
    // Non-critical — checkout-success will retry
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const org = await db.organizations.findFirst({
    where: { stripe_customer_id: customerId },
  });
  if (!org) return;

  const newPlan = subscription.metadata?.plan;
  const status = subscription.status === "active" ? "active" :
    subscription.status === "trialing" ? "trialing" :
    subscription.status === "past_due" ? "past_due" : subscription.status;

  const updateData: Record<string, unknown> = {
    subscription_status: status,
  };
  if (newPlan) updateData.plan = newPlan;

  await db.organizations.update({
    where: { id: org.id },
    data: updateData,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const org = await db.organizations.findFirst({
    where: { stripe_customer_id: customerId },
  });
  if (!org) return;

  await db.organizations.update({
    where: { id: org.id },
    data: { subscription_status: "canceled" },
  });

  await db.activity_log.create({
    data: {
      type: "subscription_canceled",
      detail: `${org.name} subscription canceled`,
      meta: { orgId: org.id },
    },
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  if (!customerId) return;

  const org = await db.organizations.findFirst({
    where: { stripe_customer_id: customerId },
  });
  if (!org) return;

  await db.organizations.update({
    where: { id: org.id },
    data: { subscription_status: "past_due" },
  });
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  if (!customerId) return;

  const org = await db.organizations.findFirst({
    where: { stripe_customer_id: customerId },
  });
  if (!org || org.subscription_status !== "past_due") return;

  await db.organizations.update({
    where: { id: org.id },
    data: { subscription_status: "active" },
  });
}
