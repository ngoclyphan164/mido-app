import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/buttons';
import { AuthSwitch, Checkbox, LabeledInput } from '@/components/ui/form';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { useSession } from '@/lib/auth';

export default function SignUp() {
  const router = useRouter();
  const { signUp } = useSession();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const result = await signUp({ displayName, email, password });
      // With email confirmation on, Supabase returns a user but no session.
      if (result.needsEmailConfirmation) setAwaitingConfirmation(true);
    } catch (caught) {
      setError(caught);
    } finally {
      setPending(false);
    }
  }

  const canSubmit =
    displayName.trim().length > 0 &&
    email.trim().length > 3 &&
    password.length >= 6 &&
    agreed &&
    !pending;

  if (awaitingConfirmation) {
    return (
      <Screen>
        <ScreenHeader title="Tạo tài khoản" />
        <EmptyState
          hint={`Mido đã gửi link xác nhận tới ${email.trim()}. Mở link đó rồi quay lại đăng nhập.`}
          title="Kiểm tra email của bạn"
        />
        <View className="px-7 pb-8 pt-2">
          <PrimaryButton label="Về trang đăng nhập" onPress={() => router.replace('/sign-in')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader onBack={() => router.replace('/sign-in')} title="Tạo tài khoản" />

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="gap-3.5 px-7 pt-[26px]">
          <LabeledInput
            autoCapitalize="words"
            label="Tên hiển thị"
            onChangeText={setDisplayName}
            placeholder="Bạn"
            value={displayName}
          />
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
            autoComplete="new-password"
            label="Mật khẩu"
            onChangeText={setPassword}
            placeholder="Tối thiểu 6 ký tự"
            secureTextEntry
            value={password}
          />
        </View>

        <View className="px-7 pt-4">
          <Checkbox checked={agreed} onToggle={() => setAgreed((current) => !current)}>
            Tôi đồng ý với Điều khoản dịch vụ và Chính sách quyền riêng tư
          </Checkbox>
        </View>

        <View className="px-7 pt-5">
          <PrimaryButton
            disabled={!canSubmit}
            label={pending ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
            onPress={submit}
          />
        </View>

        {error ? <ErrorState error={error} /> : null}
      </ScrollView>

      <View className="px-7 pb-8 pt-4">
        <AuthSwitch
          actionLabel="Đăng nhập"
          onPress={() => router.replace('/sign-in')}
          prompt="Đã có tài khoản?"
        />
      </View>
    </Screen>
  );
}
