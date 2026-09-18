import type { Session, SupabaseClient } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { api, setAccessTokenProvider } from '@/lib/api/client';
import { HAS_SUPABASE_CONFIG, MISSING_SUPABASE_MESSAGE } from '@/lib/env';
import { emailChangeRedirect, oauthRedirect, resetPasswordRedirect } from '@/lib/links';
import { authParamsError, runBrowserAuthFlow, type OAuthProvider } from '@/lib/oauth';
import { queryClient } from '@/lib/query-client';
import { canUseSupabase, getSupabase } from '@/lib/supabase';
import { useAppStore } from '@/store/use-app-store';
import { useHangoutStore } from '@/store/use-hangout-store';
import { usePendingInvite } from '@/store/use-pending-invite';

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

/**
 * Xoá sạch mọi thứ thuộc về người dùng cũ khi phiên đổi chủ.
 *
 * `queryClient` là singleton ở module scope, nên cache `['groups']`,
 * `['profiles','me']`, kèo, công bằng… sống lâu hơn phiên tạo ra chúng. Đăng
 * xuất rồi đăng nhập bằng tài khoản khác sẽ thấy dữ liệu của người trước cho
 * tới khi có ai đó kéo để làm tươi — và hồ sơ thì hiện tên cũ, vì
 * `profile.data` vẫn là bản của người cũ.
 *
 * Draft kèo và các cờ trong `useAppStore` cũng gắn với một người, nên dọn cùng.
 * Riêng mã mời đang chờ thì KHÔNG: nó tồn tại đúng để sống sót qua khoảnh khắc
 * này, khi người dùng vừa đăng nhập xong để vào nhóm được mời.
 */
function resetUserScopedState() {
  queryClient.clear();
  useAppStore.getState().resetForNewUser();
  useHangoutStore.getState().resetDraft();
}

type SignUpResult = { needsEmailConfirmation: boolean };

/** Tên gán cho khách, thay cho nhánh 'Guest' mặc định của trigger bên API. */
const GUEST_DISPLAY_NAME = 'Khách';

type SessionValue = {
  /**
   * 'loading' until the stored session has been read from disk.
   *
   * 'guest' là một phiên Supabase ẩn danh thật — có `auth.sub`, có access token,
   * có hàng `profiles` — nên mọi endpoint `/v1` đều chạy được. Nó tách khỏi
   * 'signed-in' chỉ để giao diện biết khi nào cần mời người dùng giữ lại dữ liệu.
   */
  status: 'loading' | 'signed-out' | 'guest' | 'signed-in' | 'unconfigured';
  session: Session | null;
  /** Reason the client is unusable, when status is 'unconfigured'. */
  configError: string | null;
  /** Bản rút gọn của `status === 'guest'`, để màn hình khỏi so chuỗi. */
  isGuest: boolean;
  displayName: string;
  email: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    displayName: string;
    email: string;
    password: string;
  }) => Promise<SignUpResult>;
  /** Tạo phiên khách ẩn danh. Dữ liệu họ tạo ra sống sót qua lần nâng cấp. */
  signInAsGuest: () => Promise<void>;
  /** Đăng nhập mới bằng Google/Apple qua trình duyệt. Dùng khi đã đăng xuất. */
  signInWithProvider: (provider: OAuthProvider) => Promise<boolean>;
  /** Gắn Google/Apple vào phiên khách hiện tại, giữ nguyên user id và dữ liệu. */
  linkProvider: (provider: OAuthProvider) => Promise<boolean>;
  /** Sheet Apple native, chỉ iOS. Không gắn được vào khách — xem linkProvider. */
  signInWithApple: () => Promise<void>;
  /** Đồng bộ tên từ Google/Apple về bảng profiles sau khi đăng nhập xong. */
  syncProviderProfile: () => Promise<void>;
  /** Bước 1 của nâng cấp bằng email: xin địa chỉ rồi gửi link xác nhận. */
  startEmailUpgrade: (email: string) => Promise<void>;
  /** Bước 2, sau khi link xác nhận đã chạy: đặt mật khẩu và tên hiển thị. */
  finishEmailUpgrade: (input: { password: string; displayName: string }) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  /** Gửi email đặt lại mật khẩu. Không tiết lộ email có tồn tại hay không. */
  resetPassword: (email: string) => Promise<void>;
  /** Đổi mật khẩu của phiên hiện tại — dùng sau khi link khôi phục tạo phiên. */
  updatePassword: (password: string) => Promise<void>;
  /** Đổi tên hiển thị trong JWT metadata, sau khi API đã ghi bảng profiles. */
  syncDisplayName: (displayName: string) => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  /**
   * `undefined` = chưa quan sát lần nào, khác hẳn `null` = đã biết là không có ai.
   *
   * Phân biệt hai giá trị này là cần thiết: supabase-js phát INITIAL_SESSION
   * ngay khi đăng ký listener, nên nếu coi lần đầu là "đổi người" thì mỗi lần mở
   * app đều dọn state — và hai cờ được persist trong `useAppStore` sẽ không bao
   * giờ sống qua một lần khởi động.
   */
  const knownUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const client = getSupabase();
    // No client during the static-render pass; `status` derives that case
    // without a state write, which keeps this effect free of cascading renders.
    if (!client) return;

    let cancelled = false;
    const stopAutoRefresh = startAutoRefresh(client);

    void client.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      knownUserId.current = data.session?.user.id ?? null;
      setSession(data.session ?? null);
      setReady(true);
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, next) => {
      if (cancelled) return;

      // So theo user id chứ không theo loại sự kiện: TOKEN_REFRESHED và
      // USER_UPDATED cũng chạy qua đây nhiều lần với cùng một người, mà dọn cache
      // ở những lần đó thì mỗi lần làm mới token là màn hình trắng một nhịp.
      const nextUserId = next?.user.id ?? null;
      if (knownUserId.current !== undefined && knownUserId.current !== nextUserId) {
        resetUserScopedState();
      }
      knownUserId.current = nextUserId;

      setSession(next ?? null);
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

  /**
   * Phiên khách: một anonymous user thật của Supabase, không phải phiên giả lập.
   *
   * `display_name` đi kèm vì trigger `on_auth_user_created` bên API đọc nó trước
   * nhánh `'Guest'` cứng trong SQL — không truyền thì hồ sơ tên là "Guest" giữa
   * một giao diện tiếng Việt, và trigger chỉ chạy AFTER INSERT nên không có lần
   * thứ hai để sửa.
   *
   * Không tự gọi hàm này lúc app khởi động: `signOut()` sẽ lập tức đúc một khách
   * mới và nút đăng xuất trông như hỏng. Chỗ gọi là màn chào và link mời.
   */
  const signInAsGuest = useCallback(async () => {
    const client = getSupabase();
    if (!client) throw new Error(MISSING_SUPABASE_MESSAGE);
    const { error } = await client.auth.signInAnonymously({
      options: { data: { display_name: GUEST_DISPLAY_NAME } },
    });
    if (error) throw error;
  }, []);

  /**
   * Phần chung của hai luồng OAuth: mở sheet, đọc token ở URL trả về, nạp phiên.
   *
   * Trả `false` khi người dùng đóng sheet giữa chừng — huỷ không phải lỗi, màn
   * hình gọi nó chỉ việc thôi không làm gì.
   */
  const consumeBrowserFlow = useCallback(
    async (
      client: SupabaseClient,
      url: string,
      { requireSession = true }: { requireSession?: boolean } = {},
    ): Promise<boolean> => {
      const params = await runBrowserAuthFlow(url);
      if (!params) return false;

      const failed = authParamsError(params);
      if (failed) throw new Error(failed);

      const { access_token: accessToken, refresh_token: refreshToken } = params;
      if (!accessToken || !refreshToken) {
        // Đăng nhập mới mà không có token là hỏng thật. Còn `linkIdentity` thì
        // tuỳ cấu hình project có thể quay về tay không dù đã gắn xong, nên ở
        // nhánh đó người gọi tự đi lấy phiên mới thay vì coi đây là lỗi.
        if (requireSession) {
          throw new Error('Không nhận được phiên đăng nhập từ nhà cung cấp.');
        }
        return true;
      }

      const { error } = await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) throw error;
      return true;
    },
    [],
  );

  const signInWithProvider = useCallback(
    async (provider: OAuthProvider) => {
      const client = getSupabase();
      if (!client) throw new Error(MISSING_SUPABASE_MESSAGE);

      // `skipBrowserRedirect` giữ URL lại cho mình mở bằng sheet của app, thay
      // vì đẩy ra trình duyệt ngoài rồi mất đường quay về.
      const { data, error } = await client.auth.signInWithOAuth({
        provider,
        options: { redirectTo: oauthRedirect(), skipBrowserRedirect: true },
      });
      if (error) throw error;
      return consumeBrowserFlow(client, data.url);
    },
    [consumeBrowserFlow],
  );

  /**
   * Gắn một identity mới vào user đang đăng nhập, giữ nguyên `auth.users.id`.
   *
   * Đây là lý do cả Google lẫn Apple đều đi qua trình duyệt thay vì SDK native:
   * `signInWithIdToken` luôn tạo user mới, nên một người khách bấm Google sẽ mất
   * sạch nhóm và kèo họ vừa tạo. Cần bật "Manual linking" trong Supabase.
   */
  const linkProvider = useCallback(
    async (provider: OAuthProvider) => {
      const client = getSupabase();
      if (!client) throw new Error(MISSING_SUPABASE_MESSAGE);

      const { data, error } = await client.auth.linkIdentity({
        provider,
        options: { redirectTo: oauthRedirect(), skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data.url) throw new Error('Supabase không trả về đường dẫn liên kết.');

      const linked = await consumeBrowserFlow(client, data.url, { requireSession: false });
      if (!linked) return false;

      // `linkIdentity` không phát SIGNED_IN, mà JWT cũ vẫn mang is_anonymous:
      // true cho tới lần làm mới kế tiếp. Kéo phiên mới về ngay, nếu không thì
      // `status` kẹt ở 'guest' và giao diện vẫn mời họ nâng cấp lần nữa.
      const { data: refreshed, error: refreshError } = await client.auth.refreshSession();
      if (refreshError) throw refreshError;
      if (refreshed.session) setSession(refreshed.session);
      return true;
    },
    [consumeBrowserFlow],
  );

  /**
   * Sheet Apple native — nhanh hơn hẳn luồng trình duyệt vì đi thẳng qua Face ID.
   *
   * Chỉ dùng được khi đang đăng xuất: cũng như SDK Google, `signInWithIdToken`
   * tạo user mới chứ không gắn vào khách. Khách bấm Apple sẽ đi `linkProvider`.
   */
  const signInWithApple = useCallback(async () => {
    const client = getSupabase();
    if (!client) throw new Error(MISSING_SUPABASE_MESSAGE);

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) throw new Error('Apple không trả về mã xác thực.');

    const { error } = await client.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });
    if (error) throw error;

    // Apple chỉ trả tên ở lần đăng nhập ĐẦU TIÊN của mỗi tài khoản, vĩnh viễn.
    // Bỏ lỡ lúc này thì không có cách nào lấy lại.
    const fullName = [credential.fullName?.familyName, credential.fullName?.givenName]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (fullName) {
      await client.auth.updateUser({ data: { display_name: fullName } });
    }
  }, []);

  /**
   * Bước 1 của nâng cấp bằng email.
   *
   * Khác `signUp`: user đã tồn tại (là khách), nên đây là đổi địa chỉ email chứ
   * không phải tạo tài khoản. Supabase gửi link xác nhận tới địa chỉ mới và
   * KHÔNG đặt mật khẩu ở bước này — `finishEmailUpgrade` lo phần đó sau khi họ
   * bấm link. Đổi thứ tự sẽ nhận `AuthApiError` khá tối nghĩa.
   */
  const startEmailUpgrade = useCallback(async (email: string) => {
    const client = getSupabase();
    if (!client) throw new Error(MISSING_SUPABASE_MESSAGE);
    const { error } = await client.auth.updateUser(
      { email: email.trim() },
      { emailRedirectTo: emailChangeRedirect() },
    );
    if (error) throw error;
  }, []);

  const finishEmailUpgrade = useCallback(
    async ({ password, displayName }: { password: string; displayName: string }) => {
      const client = getSupabase();
      if (!client) throw new Error(MISSING_SUPABASE_MESSAGE);
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;

      const name = displayName.trim();
      if (name) {
        const { data } = await client.auth.updateUser({ data: { display_name: name } });
        if (data.user)
          setSession((current) => (current ? { ...current, user: data.user } : current));
      }
    },
    [],
  );

  /**
   * `redirectTo` phải nằm trong Auth → URL Configuration → Redirect URLs của
   * project Supabase. Thiếu nó thì hàm này vẫn resolve, email vẫn tới, và link
   * không dẫn đi đâu — hỏng âm thầm, không có lỗi nào để bắt.
   */
  const resetPassword = useCallback(async (email: string) => {
    const client = getSupabase();
    if (!client) throw new Error(MISSING_SUPABASE_MESSAGE);
    const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: resetPasswordRedirect(),
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const client = getSupabase();
    if (!client) throw new Error(MISSING_SUPABASE_MESSAGE);
    const { error } = await client.auth.updateUser({ password });
    if (error) throw error;
  }, []);

  /**
   * Tên hiển thị có hai nguồn: bảng `profiles` mà API sở hữu, và
   * `user_metadata.display_name` trong JWT mà màn hình đọc trước khi hồ sơ kịp
   * tải về. API là nguồn chuẩn; hàm này chỉ kéo bản sao trong JWT theo sau để
   * lời chào ở Home không hiện tên cũ.
   */
  const syncDisplayName = useCallback(async (displayName: string) => {
    const client = getSupabase();
    if (!client) return;
    const { data, error } = await client.auth.updateUser({
      data: { display_name: displayName.trim() },
    });
    if (error) throw error;
    if (data.user) setSession((current) => (current ? { ...current, user: data.user } : current));
  }, []);

  /**
   * Kéo tên từ Google/Apple về bảng `profiles` sau khi đăng nhập hoặc gắn xong.
   *
   * Trigger `on_auth_user_created` bên API chỉ đọc đúng khoá `display_name` và
   * chỉ chạy AFTER INSERT, nên người đăng nhập bằng Google nhận tên là phần
   * trước @ của email, còn khách vừa nâng cấp thì vẫn mang tên "Khách" mãi mãi.
   * Không có lần thứ hai nào để trigger tự sửa — phải PATCH từ client.
   *
   * Không đụng tới avatar: `assertOwnAvatarUrl` bên API chỉ nhận URL nằm trong
   * thư mục Storage của chính người dùng, nên ảnh `lh3.googleusercontent.com`
   * của Google sẽ bị trả 422.
   */
  const syncProviderProfile = useCallback(async () => {
    const client = getSupabase();
    if (!client) return;

    const { data } = await client.auth.getUser();
    const user = data.user;
    if (!user) return;

    const metadata = user.user_metadata as
      { display_name?: string; full_name?: string; name?: string } | undefined;

    /**
     * Tên nào là chỗ giữ chỗ do hệ thống đặt, chứ không phải người dùng chọn.
     *
     * Trigger `on_auth_user_created` bên API sinh ra 'Guest' cho khách, 'Member'
     * khi không có gì để lấy, hoặc phần trước @ của email. `signInAsGuest` thì
     * đặt 'Khách'. Cả bốn đều đáng bị ghi đè bằng tên thật từ Google/Apple.
     */
    const emailLocalPart = user.email?.split('@')[0]?.trim();
    const isPlaceholder = (value: string | undefined) =>
      !value ||
      value === GUEST_DISPLAY_NAME ||
      value === 'Guest' ||
      value === 'Member' ||
      (Boolean(emailLocalPart) && value === emailLocalPart);

    const chosen = metadata?.display_name?.trim();
    const bestName =
      (isPlaceholder(chosen) ? undefined : chosen) ??
      (metadata?.full_name ?? metadata?.name)?.trim();
    if (!bestName) return;

    /*
      Đối chiếu với bảng `profiles`, KHÔNG phải với metadata trong JWT.

      Metadata chỉ là bản sao mà giao diện đọc tạm trong lúc hồ sơ chưa tải về.
      Lấy nó làm mốc thì sinh ra đúng lỗi này: `signInWithApple` ghi tên vào
      metadata trước, hàm này đọc thấy đã có tên thật nên bỏ qua, và bảng
      `profiles` giữ nguyên 'Khách' — Home hiện tên đúng còn màn Hồ sơ hiện
      'Khách', hai nơi đọc hai nguồn khác nhau.
    */
    const profile = await api.profile();
    if (isPlaceholder(profile.displayName) && profile.displayName !== bestName) {
      await api.updateProfile({ displayName: bestName });
      void queryClient.invalidateQueries();
    }

    if (chosen !== bestName) {
      const { data: updated } = await client.auth.updateUser({
        data: { display_name: bestName },
      });
      if (updated.user) {
        setSession((existing) => (existing ? { ...existing, user: updated.user } : existing));
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    const client = getSupabase();
    if (!client) return;

    // Mã mời đang chờ là của người sắp rời đi. `resetUserScopedState` cố ý giữ
    // nó lại qua các lần đổi phiên, nên chỗ duy nhất dọn được là ngay đây —
    // nếu không, người đăng nhập kế tiếp trên máy này bị kéo vào nhóm của họ.
    usePendingInvite.getState().clear();

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
    // `is_anonymous` là claim của Supabase, cũng chính là thứ mido-api đọc ra
    // `AuthUser.isAnonymous` — hai bên không thể lệch nhau.
    const isGuest = session?.user.is_anonymous === true;

    const status: SessionValue['status'] = !HAS_SUPABASE_CONFIG
      ? 'unconfigured'
      : // Prerender has no stored session, so it renders the signed-out tree.
        !canUseSupabase()
        ? 'signed-out'
        : !ready
          ? 'loading'
          : session
            ? isGuest
              ? 'guest'
              : 'signed-in'
            : 'signed-out';

    const metadata = session?.user.user_metadata as { display_name?: string } | undefined;

    return {
      status,
      session,
      configError: HAS_SUPABASE_CONFIG ? null : MISSING_SUPABASE_MESSAGE,
      isGuest,
      displayName: metadata?.display_name?.trim() || 'Bạn',
      email: session?.user.email ?? null,
      signIn,
      signUp,
      signInAsGuest,
      signInWithProvider,
      linkProvider,
      signInWithApple,
      syncProviderProfile,
      startEmailUpgrade,
      finishEmailUpgrade,
      signOut,
      deleteAccount,
      resetPassword,
      updatePassword,
      syncDisplayName,
    };
  }, [
    ready,
    session,
    signIn,
    signUp,
    signInAsGuest,
    signInWithProvider,
    linkProvider,
    signInWithApple,
    syncProviderProfile,
    startEmailUpgrade,
    finishEmailUpgrade,
    signOut,
    deleteAccount,
    resetPassword,
    updatePassword,
    syncDisplayName,
  ]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
