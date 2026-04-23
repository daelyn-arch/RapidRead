import type { VercelRequest, VercelResponse } from '@vercel/node';
import { stripe } from './_lib/stripe.js';
import { supabaseAdmin, getUserFromRequest } from './_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getUserFromRequest(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Not signed in' });

  const body = (req.body ?? {}) as { plan?: 'monthly' | 'yearly' };
  const priceId = body.plan === 'yearly'
    ? process.env.STRIPE_PRICE_YEARLY
    : process.env.STRIPE_PRICE_MONTHLY;

  if (!priceId) {
    return res.status(500).json({ error: 'Stripe price not configured' });
  }

  try {
    // Find or create Stripe customer linked to this Supabase user
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id,email,last_checkout_at')
      .eq('id', user.id)
      .maybeSingle();

    // 5-second per-user cooldown to blunt accidental spam and scripted abuse
    if (profile?.last_checkout_at) {
      const sinceMs = Date.now() - new Date(profile.last_checkout_at).getTime();
      if (sinceMs < 5000) {
        res.setHeader('Retry-After', '5');
        return res.status(429).json({ error: 'Too many requests. Please wait a few seconds.' });
      }
    }

    let customerId = profile?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? profile?.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId, email: user.email ?? null })
        .eq('id', user.id);
    }

    const appUrl = process.env.APP_URL ?? 'http://localhost:5173';
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      client_reference_id: user.id,
      subscription_data: { metadata: { supabase_user_id: user.id } },
      success_url: `${appUrl}/app/account?checkout=success`,
      cancel_url: `${appUrl}/pricing?checkout=cancel`,
    });

    // Stamp the rate-limit cooldown AFTER successfully creating a session so
    // transient Stripe errors don't leave a user locked out.
    await supabaseAdmin
      .from('profiles')
      .update({ last_checkout_at: new Date().toISOString() })
      .eq('id', user.id);

    return res.status(200).json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // eslint-disable-next-line no-console
    console.error('[checkout] failed', message);
    return res.status(500).json({ error: message });
  }
}
