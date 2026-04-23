import { useAuth } from '@/auth/useAuth';

const PRO_STATUSES = new Set(['active', 'trialing', 'past_due']);

export function useIsPro(): boolean {
  const { profile } = useAuth();
  if (!profile) return false;
  return profile.plan === 'pro' && PRO_STATUSES.has(profile.plan_status ?? '');
}
