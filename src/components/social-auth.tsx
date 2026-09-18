import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';

import { SocialButton } from '@/components/ui/buttons';
import { AppleIcon, GoogleIcon } from '@/components/ui/icons';
import { ErrorState } from '@/components/ui/states';
import { useSession } from '@/lib/auth';
import { isIdentityAlreadyLinked, type OAuthProvider } from '@/lib/oauth';

/**
 * Khối "Tiếp tục với Google / Apple", dùng chung cho đăng nhập và nâng cấp khách.
 *
 * Cùng một cặp nút nhưng hai hành vi khác nhau bên dưới:
 *
 * - Đã đăng xuất → `signInWithProvider` / `signInWithApple`, tạo user mới.
 * - Đang là khách → `linkProvider`, gắn identity vào user sẵn có để giữ nguyên
 *   `auth.users.id` cùng toàn bộ nhóm, kèo và lịch sử công bằng. Đây là lý do
 *   Apple ở nhánh khách đi qua trình duyệt chứ không dùng sheet native:
 *   `signInWithIdToken` luôn tạo user mới.
 */
export function SocialAuthButtons({ onDone }: { onDone?: () => void }) {
  const { isGuest, signInWithProvider, signInWithApple, linkProvider, syncProviderProfile } =
    useSession();

  const [appleAvailable, setAppleAvailable] = useState(false);
  const [pending, setPending] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [conflict, setConflict] = useState<OAuthProvider | null>(null);

  // Sign in with Apple có trên iOS 13+; máy Android và web thì không có gì để
  // hỏi, nên bỏ qua hẳn lời gọi.
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let cancelled = false;
    void AppleAuthentication.isAvailableAsync().then((available) => {
      if (!cancelled) setAppleAvailable(available);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Việc dọn sau khi đăng nhập thành công.
   *
   * Tên hiển thị phải kéo về ngay tại đây: hồ sơ của người mới đăng nhập bằng
   * Google đang mang phần trước @ của email, còn khách vừa nâng cấp vẫn tên
   * "Khách" — trigger bên API không có lần chạy thứ hai để sửa. Lỗi ở bước này
   * không được làm hỏng cả lần đăng nhập vừa thành công.
   */
  async function finish() {
    try {
      await syncProviderProfile();
    } catch {
      // Tên sai còn sửa được ở màn hồ sơ; chặn người dùng lại thì không.
    }
    onDone?.();
  }

  async function run(provider: OAuthProvider) {
    setPending(provider);
    setError(null);
    setConflict(null);
    try {
      if (isGuest) {
        const linked = await linkProvider(provider);
        if (!linked) return;
        await finish();
        return;
      }
      if (provider === 'apple' && appleAvailable) {
        await signInWithApple();
        await finish();
        return;
      }
      const signedIn = await signInWithProvider(provider);
      if (signedIn) await finish();
    } catch (caught) {
      // Khách bấm Google bằng địa chỉ đã từng tạo tài khoản Mido. Gộp vào
      // ErrorState chung sẽ ra một câu tiếng Anh vô nghĩa, trong khi thứ họ cần
      // là biết mình phải chọn giữa hai tài khoản.
      if (isGuest && isIdentityAlreadyLinked(caught)) setConflict(provider);
      else setError(caught);
    } finally {
      setPending(null);
    }
  }

  const busy = pending !== null;
  const showApple = Platform.OS === 'ios' && (appleAvailable || isGuest);

  return (
    <View className="gap-3">
      {error ? <ErrorState error={error} title="Chưa đăng nhập được" /> : null}

      {conflict ? (
        <View className="rounded-2xl bg-coral-soft px-4 py-3.5">
          <Text className="font-body-bold text-[13.5px] text-coral-dark">
            {conflict === 'google' ? 'Tài khoản Google' : 'Tài khoản Apple'} này đã dùng cho một tài
            khoản Mido khác
          </Text>
          <Text className="pt-1 font-body text-[12.5px] leading-[19px] text-ink-55">
            Bạn có thể đăng xuất rồi đăng nhập vào tài khoản đó, nhưng nhóm và kèo bạn vừa tạo ở chế
            độ khách sẽ không đi theo. Hoặc chọn một cách khác để giữ lại dữ liệu hiện tại.
          </Text>
        </View>
      ) : null}

      <SocialButton
        disabled={busy}
        icon={<GoogleIcon />}
        label={pending === 'google' ? 'Đang mở Google…' : 'Tiếp tục với Google'}
        onPress={() => void run('google')}
      />

      {showApple ? (
        <SocialButton
          disabled={busy}
          icon={<AppleIcon />}
          label={pending === 'apple' ? 'Đang mở Apple…' : 'Tiếp tục với Apple'}
          onPress={() => void run('apple')}
        />
      ) : null}
    </View>
  );
}

/** Gạch ngang có chữ "hoặc" ở giữa, ngăn khối social với form email. */
export function AuthDivider() {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-px flex-1 bg-ink-15" />
      <Text className="font-body text-[12.5px] text-ink-45">hoặc</Text>
      <View className="h-px flex-1 bg-ink-15" />
    </View>
  );
}
