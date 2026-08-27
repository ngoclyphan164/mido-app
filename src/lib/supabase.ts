import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { HAS_SUPABASE_CONFIG, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';

/**
 * `web.output: "static"` makes Expo render every route in Node first, where
 * there is no `window`. AsyncStorage on web is a localStorage shim, and
 * `createClient` starts recovering a session the moment it is constructed — so
 * building it at module scope crashes the static render before anything paints.
 *
 * Hence the lazy getter: the client is only constructed the first time real
 * client-side code asks for it.
 */
let cached: SupabaseClient | null | undefined;

/**
 * Auth lives entirely on the client: the app signs in anonymously against
 * Supabase and sends the resulting access token to mido-api, which verifies it
 * via JWKS. Guests are real Supabase users, so a `profiles` row (and therefore
 * group membership and votes) is created for them by a DB trigger.
 *
 * Returns null when the Supabase variables are absent, so the app can boot and
 * show a clear message instead of throwing.
 */
/**
 * False during the static-render pass, where there is no `window` and therefore
 * no stored session to recover.
 */
export function canUseSupabase(): boolean {
  return HAS_SUPABASE_CONFIG && !(Platform.OS === 'web' && typeof window === 'undefined');
}

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  if (!canUseSupabase()) {
    cached = null;
    return cached;
  }

  cached = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      // Sessions must survive relaunch — a fresh anonymous user each launch
      // would silently orphan the previous one's groups and fairness history.
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      // No URL to parse in a native app; expo-router owns deep links.
      detectSessionInUrl: false,
    },
  });
  return cached;
}
