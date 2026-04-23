import type { VercelRequest, VercelResponse } from '@vercel/node';
import type Stripe from 'stripe';
import { stripe } from './_lib/stripe';
import { supabaseAdmin } from './_lib/supabaseAdmin';

// Vercel: receive the raw body so the Stripe signature verifies correctly.
export const config = { api: { bodyParser: false } };

function readRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(typeof c === 'string' ? Buffer.from(c) : c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const PRO_STATUSES = new Set(['active', 'trialing', 'past_due']);

async function setPlanByCustomer(customerId: string, patch: {
  plan: 'free' | 'pro';
  plan_status: string | null;
  current_period_end: string | null;
}) {
  await supabaseAdmin
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('stripe_customer_id', customerId);
}

async function setPlanByUserId(userId: string, customerId: string, patch: {
  plan: 'free' | 'pro';
  plan_status: string | null;
  current_period_end: string | null;
}) {
  await supabaseAdmin
    .from('profiles')
    .update({
      ...patch,
      stripe_customer_id: customerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
}

function periodEndISO(sub: Stripe.Subscription): string | null {
  return sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method not allowed');
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers['stripe-signature'];
  if (!secret || !sig || Array.isArray(sig)) {
    return res.status(400).send('Missing signature');
  }

  let event: Stripe.Event;
  try {
    const raw = await readRawBody(req);
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error('[webhook] signature verify failed', message);
    return res.status(400).send(`Webhook Error: ${message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = (session.client_reference_id
          ?? (session.metadata?.supabase_user_id as string | undefined))
          ?? null;
        const customerId = typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id ?? null;

        if (userId && customerId) {
          // We'll resolve the real period_end in the subscription.created/updated event;
          // optimistically flip to pro so the UI reflects immediately.
          await setPlanByUserId(userId, customerId, {
            plan: 'pro',
            plan_status: 'active',
            current_period_end: null,
          });
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
        const isPro = PRO_STATUSES.has(sub.status);
        await setPlanByCustomer(customerId, {
          plan: isPro ? 'pro' : 'free',
          plan_status: sub.status,
          current_period_end: periodEndISO(sub),
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
        await setPlanByCustomer(customerId, {
          plan: 'free',
          plan_status: 'canceled',
          current_period_end: periodEndISO(sub),
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id;
        if (customerId) {
          // Keep plan='pro' for grace period; Stripe handles dunning.
          await setPlanByCustomer(customerId, {
            plan: 'pro',
            plan_status: 'past_due',
            current_period_end: null,
          });
        }
        break;
      }

      default:
        // Unhandled events are fine — ack 200 so Stripe doesn't retry.
        break;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // eslint-disable-next-line no-console
    console.error('[webhook] handler failed for', event.type, message);
    // 500 triggers a Stripe retry, which is fine since our writes are idempotent.
    return res.status(500).send(message);
  }

  return res.status(200).json({ received: true });
}
