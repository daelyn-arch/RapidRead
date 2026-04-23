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

  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id,last_portal_at')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.stripe_customer_id) {
      return res.status(400).json({ error: 'No Stripe customer on file. Subscribe first.' });
    }

    // 5-second per-user cooldown
    if (profile.last_portal_at) {
      const sinceMs = Date.now() - new Date(profile.last_portal_at).getTime();
      if (sinceMs < 5000) {
        res.setHeader('Retry-After', '5');
        return res.status(429).json({ error: 'Too many requests. Please wait a few seconds.' });
      }
    }

    const appUrl = process.env.APP_URL ?? 'http://localhost:5173';
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/app/account`,
    });

    await supabaseAdmin
      .from('profiles')
      .update({ last_portal_at: new Date().toISOString() })
      .eq('id', user.id);

    return res.status(200).json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // eslint-disable-next-line no-console
    console.error('[portal] failed', message);
    return res.status(500).json({ error: message });
  }
}
