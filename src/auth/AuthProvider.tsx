import { createContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '@/lib/supabaseClient';
import { withTimeout } from '@/lib/withTimeout';

// When Supabase is unreachable, auth-js retries a stale session's token
// refresh with backoff for ~25s per call while holding the auth lock. Never
// let the UI wait on that: give up after this long and carry on signed out.
const AUTH_TIMEOUT_MS = 5000;
const UNREACHABLE_MSG = "Couldn't reach the RapidRead server. Please try again later.";

/** Drop the persisted Supabase session without a network round trip. */
function clearLocalAuthSession() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (/^sb-.+-auth-token/.test(key)) localStorage.removeItem(key);
    }
  } catch {
    // storage unavailable (private mode etc.); nothing to clear
  }
}

function friendlyAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/timed out|failed to fetch|networkerror|load failed/i.test(msg)) return UNREACHABLE_MSG;
  return msg;
}

export interface Profile {
  id: string;
  email: string | null;
  stripe_customer_id: string | null;
  plan: 'free' | 'pro';
  plan_status: string | null;
  current_period_end: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; alreadyExists?: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Update the signed-in user's password. Requires an active session. */
  changePassword: (newPassword: string) => Promise<{ error: string | null }>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,stripe_customer_id,plan,plan_status,current_period_end')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.warn('[auth] profile fetch failed', error.message);
      setProfile(null);
      return;
    }
    setProfile(data as Profile | null);
  }

  function subscribeToProfile(userId: string) {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    channelRef.current = supabase
      .channel(`profile:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          if (payload.new) setProfile(payload.new as Profile);
        },
      )
      .subscribe();
  }

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    let active = true;

    withTimeout(supabase.auth.getSession(), AUTH_TIMEOUT_MS, 'getSession')
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        if (data.session?.user) {
          subscribeToProfile(data.session.user.id);
          return withTimeout(fetchProfile(data.session.user.id), AUTH_TIMEOUT_MS, 'fetchProfile');
        }
      })
      .catch((err) => {
        // Unreachable backend: run as signed out. If getSession resolves
        // later, onAuthStateChange will pick the session back up.
        console.warn('[auth] session restore failed', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        fetchProfile(s.user.id);
        subscribeToProfile(s.user.id);
      } else {
        setProfile(null);
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    profile,
    loading,
    configured: supabaseConfigured,
    async signIn(email, password) {
      try {
        const { error } = await withTimeout(
          supabase.auth.signInWithPassword({ email, password }),
          AUTH_TIMEOUT_MS * 3,
          'signIn',
        );
        return { error: error ? friendlyAuthError(error) : null };
      } catch (err) {
        return { error: friendlyAuthError(err) };
      }
    },
    async signUp(email, password) {
      const emailRedirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : undefined;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: emailRedirectTo ? { emailRedirectTo } : undefined,
      });
      if (error) return { error: error.message, alreadyExists: false };
      // Supabase deliberately doesn't expose a "user already exists" error
      // (that would leak account existence to anyone who tries). Instead the
      // returned user has an empty identities array when the email is
      // already registered — detect and surface it ourselves.
      const alreadyExists = !!data.user
        && Array.isArray(data.user.identities)
        && data.user.identities.length === 0;
      return { error: null, alreadyExists };
    },
    async signOut() {
      let failed = false;
      try {
        const { error } = await withTimeout(supabase.auth.signOut(), AUTH_TIMEOUT_MS, 'signOut');
        failed = !!error;
      } catch {
        failed = true;
      }
      // auth-js bails out before clearing local storage when it can't reach
      // the server, which leaves the user stuck signed in. Sign out locally.
      if (failed) {
        clearLocalAuthSession();
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        setSession(null);
        setProfile(null);
      }
    },
    async refreshProfile() {
      if (session?.user) await fetchProfile(session.user.id);
    },
    async changePassword(newPassword: string) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      return { error: error?.message ?? null };
    },
  }), [session, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
