import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/buttons';
import { AuthSwitch, LabeledInput } from '@/components/ui/form';
import { MidoMark } from '@/components/ui/icons';
import { Screen } from '@/components/ui/screen';
import { ErrorState } from '@/components/ui/states';
import { useSession } from '@/lib/auth';
import { DIAGONAL, GRADIENTS, SHADOWS } from '@/theme/tokens';

export default function SignIn() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      await signIn(email, password);
      // The root guard swaps to (app) on its own once the session lands.
    } catch (caught) {
      setError(caught);
    } finally {
      setPending(false);
    }
  }

  const canSubmit = email.trim().length > 3 && password.length >= 6 && !pending;

  return (
    <Screen>
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="px-7" style={{ paddingTop: insets.top + 28 }}>
          <LinearGradient
            colors={GRADIENTS.logoTile}
            end={DIAGONAL.end}
            start={DIAGONAL.start}
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
              ...SHADOWS.chipActive,
            }}
          >
            <MidoMark size={32} />
          </LinearGradient>

          <Text className="font-display text-[24px] text-ink">Chào mừng trở lại</Text>
          <Text className="mt-1.5 font-body text-[14px] text-ink-55">
            Đăng nhập để xem kèo của nhóm bạn
          </Text>
        </View>

        <View className="gap-3.5 px-7 pt-7">
          <LabeledInput
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            inputMode="email"
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            placeholder="ban@email.com"
            value={email}
          />
          <LabeledInput
            autoCapitalize="none"
            autoComplete="current-password"
            label="Mật khẩu"
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry={!reveal}
            trailing={
              <Pressable
                accessibilityRole="button"
                className="pl-3 active:opacity-60"
                onPress={() => setReveal((current) => !current)}
              >
                <Text className="font-body-bold text-[12px] text-ink-40">
                  {reveal ? 'ẨN' : 'HIỆN'}
                </Text>
              </Pressable>
            }
            value={password}
          />
          <View className="items-end">
            <Pressable accessibilityRole="link" className="active:opacity-60">
              <Text className="font-body-bold text-[13px] text-coral">Quên mật khẩu?</Text>
            </Pressable>
          </View>
        </View>

        <View className="px-7 pt-[22px]">
          <PrimaryButton
            disabled={!canSubmit}
            label={pending ? 'Đang đăng nhập…' : 'Đăng nhập'}
            onPress={submit}
          />
        </View>

        {error ? <ErrorState error={error} /> : null}
      </ScrollView>

      <View className="px-7 pb-8 pt-4">
        <AuthSwitch
          actionLabel="Đăng ký"
          onPress={() => router.push('/sign-up')}
          prompt="Chưa có tài khoản?"
        />
      </View>
    </Screen>
  );
}
