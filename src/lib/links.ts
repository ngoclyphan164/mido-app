import * as Linking from 'expo-linking';

import { WEB_ORIGIN } from '@/lib/env';

/**
 * Link mời ở dạng người đọc được, để dán vào tin nhắn.
 *
 * Chưa có Universal Link: không domain nào phục vụ đường dẫn này, nên chuỗi này
 * chỉ là chữ. Thứ thật sự mở được app là `inviteDeepLink` bên dưới, còn người
 * chưa cài app thì gõ tay mã chữ — vì vậy tin nhắn chia sẻ phải mang cả hai.
 */
export function inviteUrl(code: string): string {
  return `${WEB_ORIGIN}/join/${code}`;
}

/** `mido://join/<code>` — đường duy nhất hiện mở được app từ bên ngoài. */
export function inviteDeepLink(code: string): string {
  return Linking.createURL(`/join/${code}`);
}

/**
 * Nơi Supabase gửi người dùng về sau khi bấm link đặt lại mật khẩu.
 *
 * Địa chỉ này phải nằm trong Auth → URL Configuration → Redirect URLs của
 * project Supabase. Thiếu nó thì `resetPasswordForEmail` vẫn trả về thành công,
 * email vẫn tới, và link không dẫn đi đâu cả.
 */
export function resetPasswordRedirect(): string {
  return Linking.createURL('/reset-password');
}

/**
 * Nơi Supabase trả người dùng về sau khi họ đồng ý ở trang của Google/Apple.
 *
 * `WebBrowser.openAuthSessionAsync` trao thẳng URL này lại cho hàm gọi nó, nên
 * route `auth-callback` gần như không bao giờ được mở thật. Nó tồn tại làm lưới
 * an toàn: trên Android, Custom Tab đôi khi thả deep link vào app thay vì đóng
 * sheet, và một đường dẫn không có màn nào nhận sẽ thành lỗi 404 của router.
 *
 * Địa chỉ này phải nằm trong Auth → URL Configuration → Redirect URLs của
 * project Supabase, nếu không thì sheet mở ra rồi đóng lại mà không có lỗi nào.
 */
export function oauthRedirect(): string {
  return Linking.createURL('/auth-callback');
}

/**
 * Nơi link xác nhận địa chỉ email mới dẫn về, dùng khi khách nâng cấp tài khoản.
 *
 * Khác `resetPasswordRedirect`: đây là `updateUser({ email })` chứ không phải
 * khôi phục mật khẩu, và người bấm link đã có sẵn một phiên khách — nên màn
 * `confirm-email` chỉ xác nhận rồi đưa họ về đặt mật khẩu, không tự tạo phiên
 * từ đầu. Cũng phải khai trong Redirect URLs của Supabase.
 */
export function emailChangeRedirect(): string {
  return Linking.createURL('/confirm-email');
}

/**
 * Gom tham số ở cả query string lẫn fragment của một URL auth.
 *
 * Supabase đặt token ở fragment với luồng implicit (`#access_token=…`) và ở
 * query với luồng PKCE (`?code=…`), mà client này phải đỡ được cả hai. Viết tay
 * thay vì kéo `expo-auth-session` về chỉ để lấy một hàm parse: repo đã tự viết
 * `uuid.ts` và mọi helper ngày tháng, và `supabase.ts` đặt
 * `detectSessionInUrl: false` nên không còn chỗ nào khác phải parse URL auth.
 */
export function parseAuthParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};

  const hashAt = url.indexOf('#');
  const beforeHash = hashAt === -1 ? url : url.slice(0, hashAt);
  const fragment = hashAt === -1 ? '' : url.slice(hashAt + 1);

  const queryAt = beforeHash.indexOf('?');
  const query = queryAt === -1 ? '' : beforeHash.slice(queryAt + 1);

  collectInto(query, params);
  // Fragment ghi đè query: luồng implicit của Supabase để token ở đó.
  collectInto(fragment, params);

  return params;
}

function collectInto(raw: string, target: Record<string, string>) {
  for (const pair of raw.split('&')) {
    if (!pair) continue;

    const equalsAt = pair.indexOf('=');
    const rawKey = equalsAt === -1 ? pair : pair.slice(0, equalsAt);
    const rawValue = equalsAt === -1 ? '' : pair.slice(equalsAt + 1);

    const key = safeDecode(rawKey).trim();
    if (key) target[key] = safeDecode(rawValue.replace(/\+/g, ' '));
  }
}

/** URL người khác dựng có thể chứa `%` lẻ, mà `decodeURIComponent` thì ném. */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
