import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  // eslint-disable-next-line no-console
  console.error('[supabaseAdmin] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing');
}

export const supabaseAdmin = createClient(
  url ?? 'https://placeholder.supabase.co',
  serviceKey ?? 'service-key-missing',
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);

/**
 * Resolve the Supabase user from an Authorization: Bearer <access_token> header.
 * Returns null if missing or invalid.
 */
export async function getUserFromRequest(authHeader: string | undefined) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error) return null;
  return data.user ?? null;
}
