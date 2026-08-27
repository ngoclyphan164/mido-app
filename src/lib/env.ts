/**
 * Typed access to the app's environment configuration.
 *
 * Expo inlines `process.env.EXPO_PUBLIC_*` at build time, and only through
 * static dot access — destructuring or `process.env['…']` leaves the value
 * undefined in the bundle, so the reference below must stay written out.
 *
 * Values reach the client bundle in plain text. Never put secrets behind the
 * EXPO_PUBLIC_ prefix.
 */
const rawApiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!rawApiUrl) {
  throw new Error(
    'Missing EXPO_PUBLIC_API_URL. Copy .env.example to .env, then restart the dev server.',
  );
}

/** Base URL of the Mido API, normalised without a trailing slash. */
export const API_URL = rawApiUrl.replace(/\/+$/, '');

/** Joins a path onto the API base — `apiUrl('/groups')` → `…:3002/groups`. */
export function apiUrl(path: string) {
  return `${API_URL}/${path.replace(/^\/+/, '')}`;
}

/**
 * Supabase project the API validates tokens against — its JWKS is derived from
 * this URL, so the app must sign in to the *same* project as
 * `DATABASE_SUPABASE_URL` on the API side or every call returns 401.
 *
 * The publishable/anon key is safe to ship: it only grants what RLS allows, and
 * every write in this app goes through the Nest API anyway.
 */
const rawSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const rawSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** True once both Supabase variables are present. */
export const HAS_SUPABASE_CONFIG = Boolean(rawSupabaseUrl && rawSupabaseAnonKey);

export const SUPABASE_URL = rawSupabaseUrl?.replace(/\/+$/, '') ?? '';
export const SUPABASE_ANON_KEY = rawSupabaseAnonKey ?? '';

export const MISSING_SUPABASE_MESSAGE =
  'Thiếu EXPO_PUBLIC_SUPABASE_URL hoặc EXPO_PUBLIC_SUPABASE_ANON_KEY trong .env. ' +
  'Mọi endpoint /v1 cần Bearer token nên app sẽ nhận 401 cho đến khi có hai biến này.';
