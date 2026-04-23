import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  // Fail loudly at cold start rather than at request time.
  // eslint-disable-next-line no-console
  console.error('[stripe] STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(key ?? 'sk_missing', {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});
