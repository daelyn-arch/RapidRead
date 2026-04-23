import { supabase } from '@/lib/supabaseClient';

export interface StartCheckoutResult {
  error: string | null;
  url: string | null;
}

/**
 * Create a Stripe Checkout session for the signed-in user and return the URL
 * to redirect to. Caller is responsible for `window.location.assign(url)`.
 */
export async function startCheckout(plan: 'monthly' | 'yearly'): Promise<StartCheckoutResult> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { error: 'Not signed in', url: null };

  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ plan }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.url) {
      return { error: body?.error ?? `Checkout failed (${res.status})`, url: null };
    }
    return { error: null, url: body.url as string };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e), url: null };
  }
}
