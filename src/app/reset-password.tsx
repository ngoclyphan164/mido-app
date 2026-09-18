import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/buttons';
import { LabeledInput } from '@/components/ui/form';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useSession } from '@/lib/auth';
import { parseAuthParams } from '@/lib/links';
import { getSupabase } from '@/lib/supabase';

type Stage = 'opening' | 'ready' | 'invalid';

/**
 * Đích của link khôi phục mật khẩu từ email Supabase.
 *
 * Màn này nằm ngoài guard (xem `src/app/_layout.tsx`): chính việc mở link tạo ra
 * một phiên, nên nếu nó thuộc `(auth)` thì guard sẽ gỡ màn xuống ngay giữa lúc
 * người dùng chuẩn bị gõ mật khẩu mới.
 */
export default function ResetPassword() {
  const router = useRouter();
  const { updatePassword } = useSession();

  const url = Linking.useLinkingURL();

  const [stage, setStage] = useState<Stage>('opening');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  // Một URL chỉ được đổi lấy phiên đúng một lần: token khôi phục dùng một lần,
  // và `reactCompiler` khiến số lần render không đoán được.
  const consumed = useRef<string | null>(null);

  useEffect(() => {
    if (!url || consumed.current === url) return;
    consumed.current = url;

    const params = parseAuthParams(url);

    void (async () => {
      // Mọi nhánh đặt state đều nằm trong hàm async này: React Compiler cấm gọi
      // setState thẳng trong thân effect.
      const client = getSupabase();
      if (!client) {
        setStage('invalid');
        return;
      }

      try {
        // Supabase để token ở fragment với luồng implicit và ở query với PKCE.
        // Đỡ cả hai ở đây rẻ hơn là đổi `flowType` trong supabase.ts, vì không
        // có luồng nào khác trong app dùng auth code.
        if (params.access_token && params.refresh_token) {
          const { error: caught } = await client.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          if (caught) throw caught;
        } else if (params.code) {
          const { error: caught } = await client.auth.exchangeCodeForSession(params.code);
          if (caught) throw caught;
        } else {
          setStage('invalid');
          return;
        }
        setStage('ready');
      } catch (caught) {
        setError(caught);
        setStage('invalid');
      }
    })();
  }, [url]);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      await updatePassword(password);
      router.replace('/');
    } catch (caught) {
      setError(caught);
    } finally {
      setPending(false);
    }
  }

  const canSubmit = password.length >= 6 && password === confirmation && !pending;

  return (
    <Screen>
      <ScreenHeader
        back={false}
        subtitle={stage === 'ready' ? 'Chọn mật khẩu mới cho tài khoản' : undefined}
        title="Đặt lại mật khẩu"
      />

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        {stage === 'opening' ? (
          <LoadingState label="Đang mở link…" />
        ) : stage === 'invalid' ? (
          <View className="gap-2.5 px-5 pt-7">
            <Text className="font-heading text-[16px] text-ink">Link không dùng được</Text>
            <Text className="font-body text-[13.5px] leading-[21px] text-ink-55">
              Link đặt lại mật khẩu chỉ dùng được một lần và hết hạn sau một thời gian ngắn. Xin một
              link mới từ màn đăng nhập.
            </Text>
          </View>
        ) : (
          <View className="gap-3.5 px-5 pt-7">
            <LabeledInput
              autoCapitalize="none"
              autoComplete="new-password"
              label="Mật khẩu mới"
              onChangeText={setPassword}
              placeholder="Ít nhất 6 ký tự"
              secureTextEntry
              value={password}
            />
            <LabeledInput
              autoCapitalize="none"
              autoComplete="new-password"
              label="Nhập lại mật khẩu"
              onChangeText={setConfirmation}
              placeholder="••••••••"
              secureTextEntry
              value={confirmation}
            />
            {confirmation.length > 0 && password !== confirmation ? (
              <Text className="font-body text-[12.5px] text-coral-dark">
                Hai mật khẩu chưa khớp nhau.
              </Text>
            ) : null}
          </View>
        )}

        {error ? <ErrorState error={error} title="Chưa đổi được mật khẩu" /> : null}
      </ScrollView>

      <View className="px-5 pb-8 pt-5">
        {stage === 'ready' ? (
          <PrimaryButton
            disabled={!canSubmit}
            label={pending ? 'Đang lưu…' : 'Đổi mật khẩu'}
            onPress={() => void submit()}
          />
        ) : stage === 'invalid' ? (
          <PrimaryButton label="Về đăng nhập" onPress={() => router.replace('/')} />
        ) : null}
      </View>
    </Screen>
  );
}
