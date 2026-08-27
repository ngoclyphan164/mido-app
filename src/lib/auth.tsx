import type { Session, SupabaseClient } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { api, setAccessTokenProvider } from '@/lib/api/client';
import { HAS_SUPABASE_CONFIG, MISSING_SUPABASE_MESSAGE } from '@/lib/env';
import { queryClient } from '@/lib/query-client';
import { canUseSupabase, getSupabase } from '@/lib/supabase';

/**
 * Hands the API client a token getter. `getSession()` refreshes on its own when
 * the stored token is close to expiry, so the client layer never needs to know
 * that Supabase exists.
 */
setAccessTokenProvider(async () => {
  const client = getSupabase();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
});

/** Keeps the token fresh while the app is in the foreground. */
function startAutoRefresh(client: SupabaseClient) {
  client.auth.startAutoRefresh();
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') client.auth.startAutoRefresh();
    else client.auth.stopAutoRefresh();
  });
  return () => {
    subscription.remove();
    client.auth.stopAutoRefresh();
  };
}

type SignUpResult = { needsEmailConfirmation: boolean };

type SessionValue = {
  /** 'loading' until the stored session has been read from disk. */
  status: 'loading' | 'signed-out' | 'signed-in' | 'unconfigured';
  session: Session | null;
  /** Reason the client is unusable, when status is 'unconfigured'. */
  configError: string | null;
  displayName: string;
  email: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    displayName: string;
    email: string;
    password: string;
  }) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const client = getSupabase();
    // No client during the static-render pass; `status` derives that case
    // without a state write, which keeps this effect free of cascading renders.
    if (!client) return;

    let cancelled = false;
    const stopAutoRefresh = startAutoRefresh(client);

    void client.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session ?? null);
      setReady(true);
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, next) => {
      if (!cancelled) setSession(next ?? null);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
      stopAutoRefresh();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const client = getSupabase();
    if (!client) throw new Error(MISSING_SUPABASE_MESSAGE);
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(
    async ({
      displayName,
      email,
      password,
    }: {
      displayName: string;
      email: string;
      password: string;
    }): Promise<SignUpResult> => {
      const client = getSupabase();
      if (!client) throw new Error(MISSING_SUPABASE_MESSAGE);
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
        // The API's on_auth_user_created trigger copies this into
        // profiles.display_name, which is the name the whole app shows.
        options: { data: { display_name: displayName.trim() } },
      });
      if (error) throw error;
      // Supabase returns a user but no session when email confirmation is on.
      return { needsEmailConfirmation: !data.session };
    },
    [],
  );

  const signOut = useCallback(async () => {
    const client = getSupabase();
    if (!client) return;
    await client.auth.signOut();
  }, []);

  const deleteAccount = useCallback(async () => {
    const client = getSupabase();
    if (!client) throw new Error(MISSING_SUPABASE_MESSAGE);

    // The API owns the privileged Supabase deletion. Only clear the device after
    // it confirms success; otherwise the user must remain signed in to retry.
    await api.deleteAccount();
    queryClient.clear();

    // The auth user no longer exists, so a network/global sign-out can fail.
    // Local scope still removes the persisted session and emits SIGNED_OUT.
    try {
      await client.auth.signOut({ scope: 'local' });
    } catch {
      // Deletion already succeeded server-side. A storage cleanup failure must
      // not leave the deleted identity in the app's signed-in navigation tree.
    } finally {
      setSession(null);
    }
  }, []);

  const value = useMemo<SessionValue>(() => {
    const status: SessionValue['status'] = !HAS_SUPABASE_CONFIG
      ? 'unconfigured'
      : // Prerender has no stored session, so it renders the signed-out tree.
        !canUseSupabase()
        ? 'signed-out'
        : !ready
          ? 'loading'
          : session
            ? 'signed-in'
            : 'signed-out';

    const metadata = session?.user.user_metadata as { display_name?: string } | undefined;

    return {
      status,
      session,
      configError: HAS_SUPABASE_CONFIG ? null : MISSING_SUPABASE_MESSAGE,
      displayName: metadata?.display_name?.trim() || 'Bạn',
      email: session?.user.email ?? null,
      signIn,
      signUp,
      signOut,
      deleteAccount,
    };
  }, [ready, session, signIn, signUp, signOut, deleteAccount]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
