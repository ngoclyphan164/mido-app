import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OutlineButton } from '@/components/ui/buttons';
import { Screen } from '@/components/ui/screen';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { Card } from '@/components/ui/typography';
import { useInvitePreview, useJoinGroup } from '@/lib/api/queries';
import { useSession } from '@/lib/auth';
import { usePendingInvite } from '@/store/use-pending-invite';
import { SHADOWS } from '@/theme/tokens';

/**
 * Đích của `mido://join/<code>`.
 *
 * Màn này nằm ngoài cả `(app)` lẫn `(auth)` vì link có thể đến ở bất kỳ trạng
 * thái đăng nhập nào — xem chú thích ở `src/app/_layout.tsx`.
 */
export default function JoinGroup() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { status, signInAsGuest } = useSession();

  const setPendingCode = usePendingInvite((state) => state.setCode);
  const clearPendingCode = usePendingInvite((state) => state.clear);

  // Khách cũng vào nhóm được, nên cả hai trạng thái đều đủ điều kiện join.
  const signedIn = status === 'signed-in' || status === 'guest';

  const [guestError, setGuestError] = useState<unknown>(null);
  // Xem trước chạy được cả khi chưa đăng nhập: nó là route công khai.
  const preview = useInvitePreview(code);
  const joinGroup = useJoinGroup();

  /**
   * Latch bằng ref chứ không dựa vào số lần render: `reactCompiler: true` nên
   * không suy luận được component chạy bao nhiêu lần, mà vào nhóm hai lần thì
   * lần thứ hai chỉ tốn một request thừa. Cùng khuôn với `suggestions.tsx:52`.
   */
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current || !signedIn || !code) return;
    fired.current = true;

    /*
      Xoá mã NGAY khi bắt đầu, chứ không đợi `onSuccess`, vì hai lý do.

      Một: mã hỏng hoặc hết hạn mà nằm lại trong AsyncStorage sẽ khiến
      `PendingInviteRedeemer` ném người dùng vào đúng màn lỗi này ở mọi lần mở
      app — không có gì dọn nó đi cả.

      Hai: từ khi khách được tạo ngay tại màn này, màn không còn bị gỡ xuống lúc
      phiên xuất hiện nữa. `(app)` mount ngay sau đó, thấy mã còn đó và
      `router.replace` về chính route đang đứng — remount, latch `fired` reset,
      và vào nhóm lần thứ hai.

      Đổi lại: nếu join hỏng vì mạng thì lời mời mất. Chấp nhận được — màn lỗi
      bên dưới đã có sẵn lối "Nhập mã mời bằng tay", còn vòng lặp vô hạn thì
      không có lối nào.
    */
    clearPendingCode();

    joinGroup.mutate(code, {
      onSuccess: (result) => router.replace(`/group/${result.group.id}`),
    });
  }, [clearPendingCode, code, joinGroup, router, signedIn]);

  /**
   * Chưa đăng nhập thì tạo luôn một phiên khách, không hỏi.
   *
   * Đây là ngoại lệ duy nhất của nguyên tắc "khách phải tự bấm mới tạo" ở màn
   * chào: người vừa mở link mời đã nói rõ họ muốn gì, và bắt họ đăng ký trước
   * khi thấy nhóm là đúng thứ khách hàng phàn nàn. Mã vẫn được giữ lại trước,
   * để nếu tạo khách hỏng thì `(app)/_layout.tsx` còn đường quay lại.
   */
  const provisioned = useRef(false);
  useEffect(() => {
    if (status !== 'signed-out' || !code) return;
    setPendingCode(code);

    if (provisioned.current) return;
    provisioned.current = true;

    void signInAsGuest().catch((caught: unknown) => setGuestError(caught));
  }, [code, setPendingCode, signInAsGuest, status]);

  if (status === 'loading' || (status === 'signed-out' && !guestError)) {
    return (
      <Screen>
        <LoadingState className="flex-1" label="Đang mở lời mời…" />
      </Screen>
    );
  }

  // Chỉ rơi về màn đăng nhập khi không dựng nổi phiên khách — hết hạn mức 30
  // lượt/giờ mỗi IP của Supabase, hoặc máy đang mất mạng.
  if (status === 'signed-out' && guestError) return <Redirect href="/sign-in" />;

  const error = guestError ?? joinGroup.error ?? (preview.isError ? preview.error : null);

  return (
    <Screen>
      <View className="flex-1 justify-center px-5" style={{ paddingTop: insets.top }}>
        {error ? (
          <View className="gap-4">
            <ErrorState error={error} title="Không vào được nhóm" />
            <OutlineButton
              label="Nhập mã mời bằng tay"
              onPress={() => router.replace('/group/new?tab=join')}
              tone="neutral"
            />
          </View>
        ) : (
          <View className="gap-5">
            {preview.data ? (
              <Card className="items-center gap-1.5 p-5" style={SHADOWS.card}>
                <Text className="font-body text-[13px] text-ink-55">Bạn được mời vào nhóm</Text>
                <Text className="text-center font-heading text-[19px] text-ink">
                  {preview.data.groupName}
                </Text>
                <Text className="font-body text-[12.5px] text-ink-45">
                  {`${preview.data.memberCount} thành viên`}
                </Text>
              </Card>
            ) : null}
            <LoadingState label="Đang vào nhóm…" />
          </View>
        )}
      </View>
    </Screen>
  );
}
