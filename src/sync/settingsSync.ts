import { supabase } from '@/lib/supabaseClient';
import type { AppSettings } from '@/types/settings';

interface CloudSettingsRow {
  user_id: string;
  data: AppSettings;
  updated_at: string;
}

export async function fetchCloudSettings(userId: string): Promise<CloudSettingsRow | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('user_id,data,updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`fetchCloudSettings: ${error.message}`);
  return (data as CloudSettingsRow) ?? null;
}

export async function pushCloudSettings(userId: string, settings: AppSettings): Promise<string> {
  const { data, error } = await supabase
    .from('user_settings')
    .upsert(
      { user_id: userId, data: settings, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
    .select('updated_at')
    .single();
  if (error) throw new Error(`pushCloudSettings: ${error.message}`);
  return (data as { updated_at: string }).updated_at;
}
