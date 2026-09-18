import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { ChevronRight } from '@/components/ui/icons';
import { useSession } from '@/lib/auth';
import { useAppStore } from '@/store/use-app-store';
import { SHADOWS } from '@/theme/tokens';

/**
 * Lời mời lưu tài khoản ở Home, và lời nhắc đặt mật khẩu khi luồng nâng cấp
 * dừng giữa chừng.
 *
 * Hai trạng thái, hai mức độ khẩn cấp khác nhau:
 *
 * - Khách: dữ liệu chỉ nằm trên máy này. Nhắc rồi tắt được — chặn lại chính là
 *   thứ khách hàng đang phàn nàn.
 * - Đã xác nhận email nhưng chưa đặt mật khẩu: tài khoản đã hết ẩn danh nên
 *   `isGuest` là false và mọi lời mời nâng cấp tắt hết, trong khi họ vẫn chưa
 *   có cách nào đăng nhập lại. KHÔNG tắt được, vì đây là cái bẫy chứ không phải
 *   gợi ý.
 */
export function GuestNudge() {
  const router = useRouter();
  const { isGuest } = useSession();
  const needsPassword = useAppStore((state) => state.needsPasswordSetup);
  const dismissed = useAppStore((state) => state.guestNudgeDismissed);
  const dismiss = useAppStore((state) => state.dismissGuestNudge);

  if (needsPassword) {
    return (
      <View className="px-5 pt-5">
        <Pressable
          accessibilityRole="button"
          className="flex-row items-center gap-3 rounded-card bg-amber-bg p-3.5 active:opacity-90"
          onPress={() => router.push('/upgrade')}
          style={SHADOWS.card}
        >
          <View className="flex-1">
            <Text className="font-body-bold text-[13.5px] text-amber">Chưa đặt mật khẩu</Text>
            <Text className="pt-0.5 font-body text-[12.5px] leading-[19px] text-ink-55">
              Email đã xác nhận rồi. Đặt mật khẩu để lần sau đăng nhập lại được.
            </Text>
          </View>
          <ChevronRight size={12} />
        </Pressable>
      </View>
    );
  }

  if (!isGuest || dismissed) return null;

  return (
    <View className="px-5 pt-5">
      <View
        className="flex-row items-center gap-3 rounded-card bg-coral-soft p-3.5"
        style={SHADOWS.card}
      >
        <Pressable
          accessibilityRole="button"
          className="flex-1 active:opacity-70"
          onPress={() => router.push('/upgrade')}
        >
          <Text className="font-body-bold text-[13.5px] text-coral-dark">Bạn đang dùng thử</Text>
          <Text className="pt-0.5 font-body text-[12.5px] leading-[19px] text-ink-55">
            Lưu tài khoản để không mất nhóm và kèo khi đổi máy.
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Ẩn lời nhắc"
          accessibilityRole="button"
          className="px-1 py-2 active:opacity-60"
          hitSlop={8}
          onPress={dismiss}
        >
          <Text className="font-body-bold text-[12px] text-ink-45">ẨN</Text>
        </Pressable>
        <ChevronRight size={12} />
      </View>
    </View>
  );
}
