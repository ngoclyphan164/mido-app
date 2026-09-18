import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/buttons';
import { AuthSwitch } from '@/components/ui/form';
import { MidoMark } from '@/components/ui/icons';
import { Screen } from '@/components/ui/screen';
import { ErrorState } from '@/components/ui/states';
import { useSession } from '@/lib/auth';
import { usePendingInvite } from '@/store/use-pending-invite';
import { DIAGONAL, GRADIENTS, SHADOWS } from '@/theme/tokens';

/** Ba câu trả lời cho "Mido làm gì?", theo đúng thứ tự một kèo diễn ra. */
const PITCH = [
  'Rủ nhóm đi chơi mà không cần chốt địa điểm trước',
  'Mido tìm chỗ hẹn ở giữa, ai cũng đi gần như nhau',
  'Cả nhóm bình chọn, ai đi xa nhiều lần sẽ được ưu tiên',
];

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signInAsGuest } = useSession();
  const pendingInvite = usePendingInvite((state) => state.code);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function startAsGuest() {
    setPending(true);
    setError(null);
    try {
      await signInAsGuest();
      // Guard ở root tự lật sang (app) khi phiên về.
    } catch (caught) {
      setError(caught);
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen>
      <View className="flex-1 justify-between px-7" style={{ paddingTop: insets.top + 48 }}>
        <View>
          <LinearGradient
            colors={GRADIENTS.logoTile}
            end={DIAGONAL.end}
            start={DIAGONAL.start}
            style={{
              width: 60,
              height: 60,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 28,
              ...SHADOWS.chipActive,
            }}
          >
            <MidoMark size={36} />
          </LinearGradient>

          <Text className="font-display text-[28px] leading-[36px] text-ink">
            Hẹn nhau ở chỗ{'\n'}ai cũng tiện
          </Text>

          <View className="gap-3 pt-7">
            {PITCH.map((line) => (
              <View className="flex-row gap-2.5" key={line}>
                <View className="mt-[7px] h-1.5 w-1.5 rounded-full bg-coral" />
                <Text className="flex-1 font-body text-[14px] leading-[22px] text-ink-55">
                  {line}
                </Text>
              </View>
            ))}
          </View>

          {pendingInvite ? (
            <Text className="pt-6 font-body-bold text-[13px] text-coral">
              Bạn đang được mời vào một nhóm — bấm bên dưới để vào.
            </Text>
          ) : null}
        </View>

        <View className="gap-4 pb-8">
          {/* Lỗi hay gặp nhất ở đây là mất mạng, hoặc quá 30 lượt/giờ mỗi IP mà
              Supabase đặt cho anonymous sign-in. Cả hai đều phải nói ra, và lối
              đăng nhập bằng tài khoản sẵn có phải luôn bấm được. */}
          {error ? <ErrorState error={error} title="Chưa vào được" /> : null}

          <View className="gap-1.5">
            <PrimaryButton
              disabled={pending}
              label={pending ? 'Đang mở…' : 'Dùng thử ngay'}
              onPress={() => void startAsGuest()}
            />
            <Text className="text-center font-body text-[12.5px] text-ink-45">
              Không cần tài khoản. Đăng ký sau vẫn giữ nguyên dữ liệu.
            </Text>
          </View>

          <AuthSwitch
            actionLabel="Đăng nhập"
            onPress={() => router.push('/sign-in')}
            prompt="Đã có tài khoản?"
          />
        </View>
      </View>
    </Screen>
  );
}
