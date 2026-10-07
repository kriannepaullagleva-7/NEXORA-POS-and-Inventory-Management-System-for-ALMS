import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

/** Accepts either a full `https://<ref>.supabase.co` URL or just the project ref. */
const resolveUrl = (value: string) => {
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value.replace(/\/+$/, '');
  return `https://${value}.supabase.co`;
};

export const supabaseUrl = resolveUrl(rawUrl);

/** False when the env vars are missing, so the UI can show a setup message instead of crashing. */
export const isSupabaseConfigured = Boolean(supabaseUrl && anonKey);

if (!isSupabaseConfigured) {
  console.error(
    'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local and restart the dev server.'
  );
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', anonKey || 'placeholder', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
