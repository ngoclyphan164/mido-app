import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/buttons';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { parseAuthParams } from '@/lib/links';
import { getSupabase } from '@/lib/supabase';
import { useAppStore } from '@/store/use-app-store';

type Stage = 'opening' | 'done' | 'invalid';

/**
 * Đích của link xác nhận địa chỉ email mới, ở bước 1 của luồng nâng cấp khách.
 *
 * Nằm ngoài guard cùng lý do với `reset-password`: mở link làm phiên đổi trạng
 * thái ngay dưới chân màn hình đang hiện. Khác ở chỗ người mở link đã có sẵn
 * một phiên khách, nên xong việc là đưa họ về `/upgrade` đặt mật khẩu chứ không
 * bắt đăng nhập lại.
 */
export default function ConfirmEmail() {
  const router = useRouter();
  const url = Linking.useLinkingURL();
  const setNeedsPasswordSetup = useAppStore((state) => state.setNeedsPasswordSetup);

  const [stage, setStage] = useState<Stage>('opening');
  const [error, setError] = useState<unknown>(null);

  // Token trong link dùng một lần; `reactCompiler` khiến số lần render không
  // đoán được, nên latch theo URL thay vì theo số lần chạy.
  const consumed = useRef<string | null>(null);

  useEffect(() => {
    if (!url || consumed.current === url) return;
    consumed.current = url;

    const params = parseAuthParams(url);

    void (async () => {
      const client = getSupabase();
      if (!client) {
        setStage('invalid');
        return;
      }

      try {
        // Cùng hai dạng token như `reset-password`: fragment cho luồng implicit,
        // query cho PKCE.
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
        // Từ đây tài khoản đã hết ẩn danh nhưng chưa có mật khẩu. Ghi cờ NGAY,
        // trước khi điều hướng, để người dùng thoát ra giữa chừng vẫn còn đường
        // quay lại đặt mật khẩu.
        setNeedsPasswordSetup(true);
        setStage('done');
      } catch (caught) {
        setError(caught);
        setStage('invalid');
      }
    })();
  }, [setNeedsPasswordSetup, url]);

  return (
    <Screen>
      <ScreenHeader back={false} title="Xác nhận email" />

      <View className="flex-1 px-5 pt-7">
        {stage === 'opening' ? (
          <LoadingState label="Đang xác nhận…" />
        ) : stage === 'invalid' ? (
          <View className="gap-2.5">
            <Text className="font-heading text-[16px] text-ink">Link không dùng được</Text>
            <Text className="font-body text-[13.5px] leading-[21px] text-ink-55">
              Link xác nhận chỉ dùng được một lần và hết hạn sau một thời gian ngắn. Mở lại phần lưu
              tài khoản trong app để gửi link mới.
            </Text>
          </View>
        ) : (
          <View className="gap-2.5">
            <Text className="font-heading text-[16px] text-ink">Đã xác nhận email</Text>
            <Text className="font-body text-[13.5px] leading-[21px] text-ink-55">
              Còn một bước nữa: đặt mật khẩu để lần sau đăng nhập lại được. Nhóm và kèo của bạn vẫn
              nguyên vẹn.
            </Text>
          </View>
        )}

        {error ? <ErrorState error={error} title="Chưa xác nhận được" /> : null}
      </View>

      <View className="px-5 pb-8 pt-5">
        {stage === 'done' ? (
          <PrimaryButton label="Đặt mật khẩu" onPress={() => router.replace('/upgrade')} />
        ) : stage === 'invalid' ? (
          <PrimaryButton label="Về trang chủ" onPress={() => router.replace('/')} />
        ) : null}
      </View>
    </Screen>
  );
}
