import * as WebBrowser from 'expo-web-browser';

import { oauthRedirect, parseAuthParams } from '@/lib/links';

/** Nhà cung cấp OAuth mà Mido mở bằng trình duyệt. */
export type OAuthProvider = 'google' | 'apple';

export const OAUTH_PROVIDER_LABELS: Record<OAuthProvider, string> = {
  google: 'Google',
  apple: 'Apple',
};

/**
 * Chạy phần trình duyệt của một luồng OAuth và trả về tham số trong URL redirect.
 *
 * Dùng chung cho `signInWithOAuth` (đăng nhập mới) lẫn `linkIdentity` (khách
 * nâng cấp): cả hai đều chỉ sinh ra một URL để mở, phần còn lại giống hệt nhau.
 *
 * `@supabase/auth-js` mặc định `flowType: 'implicit'` và `src/lib/supabase.ts`
 * không đặt lại, nên redirect mang token ở fragment (`#access_token=…`) — đúng
 * dạng mà `parseAuthParams` đã viết sẵn để đọc. Vì vậy không cần PKCE, không cần
 * `exchangeCodeForSession`, và không cần kéo `expo-auth-session` về.
 *
 * Trả `null` khi người dùng đóng sheet. Đó không phải lỗi, nên đừng ném.
 */
export async function runBrowserAuthFlow(url: string): Promise<Record<string, string> | null> {
  const redirect = oauthRedirect();

  /*
    Chuỗi này phải nằm nguyên văn trong Supabase → Authentication → URL
    Configuration → Redirect URLs. Sai một ký tự thì Supabase im lặng bỏ qua
    `redirectTo` và đá về Site URL của project — mặc định là localhost:3000, nên
    triệu chứng là Safari báo không kết nối được máy chủ chứ không phải một lỗi
    auth nào cả.

    `Linking.createURL` có thể trả `mido://auth-callback` hoặc `mido:///auth-callback`
    tuỳ kiểu build, nên in ra rồi đối chiếu vẫn nhanh hơn là suy luận.
  */
  if (__DEV__) {
    console.log('[oauth] redirect URI:', redirect);
  }

  const result = await WebBrowser.openAuthSessionAsync(url, redirect);
  if (result.type !== 'success') return null;
  return parseAuthParams(result.url);
}

/**
 * Lỗi mà Supabase trả về nằm trong chính URL redirect, không nằm ở chỗ ném
 * exception — `openAuthSessionAsync` vẫn coi đó là 'success'. Bỏ qua bước này
 * thì một lần từ chối quyền sẽ đi tiếp và chết ở `setSession` với thông báo vô
 * nghĩa ("access_token is required").
 */
export function authParamsError(params: Record<string, string>): string | null {
  const description = params.error_description ?? params.error;
  return description ? description.trim() || null : null;
}

/**
 * True khi Supabase từ chối link vì identity đó đã thuộc về một tài khoản khác.
 *
 * Đây là ca hay gặp nhất của luồng nâng cấp: khách bấm Google bằng một địa chỉ
 * mà họ đã từng tạo tài khoản Mido. Gộp nó vào `ErrorState` chung sẽ ra một câu
 * tiếng Anh khó hiểu, trong khi thứ họ cần là một lựa chọn rõ ràng.
 */
export function isIdentityAlreadyLinked(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /already\s+(been\s+)?(linked|registered)|identity_already_exists|user_already_exists/i.test(
    message,
  );
}
