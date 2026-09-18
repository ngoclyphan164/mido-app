import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { OutlineButton, PrimaryButton } from '@/components/ui/buttons';
import { LabeledInput } from '@/components/ui/form';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { ErrorState } from '@/components/ui/states';
import { useSession } from '@/lib/auth';

export default function ForgotPassword() {
  const router = useRouter();
  const { resetPassword } = useSession();

  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (caught) {
      setError(caught);
    } finally {
      setPending(false);
    }
  }

  const canSubmit = email.trim().length > 3 && !pending;

  return (
    <Screen>
      <ScreenHeader subtitle="Nhập email đã đăng ký" title="Quên mật khẩu" />

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        {sent ? (
          <View className="gap-2.5 px-5 pt-7">
            <Text className="font-heading text-[16px] text-ink">Đã gửi xong</Text>
            {/*
              Cố tình không nói email có tồn tại hay không: màn này công khai, và
              câu trả lời khác nhau cho hai trường hợp là một cách dò xem ai đã
              đăng ký Mido.
            */}
            <Text className="font-body text-[13.5px] leading-[21px] text-ink-55">
              Nếu email này đã đăng ký Mido, link đặt lại mật khẩu đang trên đường tới hộp thư. Mở
              link đó trên chính chiếc máy này để đổi mật khẩu.
            </Text>
          </View>
        ) : (
          <View className="gap-3.5 px-5 pt-7">
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
          </View>
        )}

        {error ? <ErrorState error={error} title="Chưa gửi được email" /> : null}
      </ScrollView>

      <View className="gap-2.5 px-5 pb-8 pt-5">
        {sent ? (
          <OutlineButton label="Về đăng nhập" onPress={() => router.back()} tone="neutral" />
        ) : (
          <PrimaryButton
            disabled={!canSubmit}
            label={pending ? 'Đang gửi…' : 'Gửi link đặt lại'}
            onPress={() => void submit()}
          />
        )}
      </View>
    </Screen>
  );
}
