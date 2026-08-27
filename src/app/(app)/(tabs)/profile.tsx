import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { DangerButton, OutlineButton } from '@/components/ui/buttons';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useRefreshControl } from '@/components/ui/refresh';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { ErrorState } from '@/components/ui/states';
import { Card, SectionTitle } from '@/components/ui/typography';
import { hueIndexFor, initialOf } from '@/lib/api/present';
import { useMe } from '@/lib/api/queries';
import { useSession } from '@/lib/auth';
import { SHADOWS } from '@/theme/tokens';

export default function Profile() {
  const { deleteAccount, displayName, email, signOut } = useSession();
  const me = useMe();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>(null);

  const refreshControl = useRefreshControl([me]);

  async function removeAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
    } catch (error) {
      setDeleteError(error);
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader back={false} title="Cá nhân" />

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-6"
        refreshControl={refreshControl}
      >
        <View className="items-center gap-3 px-5 pt-6">
          <Avatar
            hueIndex={hueIndexFor(me.data?.user.id ?? displayName)}
            initial={initialOf(displayName)}
            size={72}
          />
          <Text className="font-heading text-[19px] text-ink">{displayName}</Text>
          {email ? <Text className="font-body text-[13.5px] text-ink-55">{email}</Text> : null}
        </View>

        {me.data ? (
          <View className="px-5 pt-6">
            <Card className="gap-1 p-4" style={SHADOWS.card}>
              <Text className="font-body text-[12px] text-ink-45">Tài khoản</Text>
              <Text className="font-body text-[13px] text-ink">
                {me.data.user.isAnonymous ? 'Khách (chưa đăng ký)' : 'Đã đăng ký email'}
              </Text>
            </Card>
          </View>
        ) : null}

        <View className="gap-2.5 px-5 pt-9">
          <SectionTitle>Xóa tài khoản</SectionTitle>
          <Text className="font-body text-[13px] leading-[20px] text-ink-55">
            Tài khoản, nhóm và kèo bạn đã tạo, vị trí, bình chọn cùng dữ liệu công bằng liên quan sẽ
            bị xóa vĩnh viễn. Không thể hoàn tác.
          </Text>
          <DangerButton
            disabled={deleting}
            label={deleting ? 'Đang xóa tài khoản…' : 'Xóa tài khoản'}
            onPress={() => {
              setDeleteError(null);
              setConfirmingDelete(true);
            }}
          />
          {deleteError ? <ErrorState error={deleteError} title="Chưa xóa được tài khoản" /> : null}
        </View>
      </ScrollView>

      <View className="px-5 pb-6 pt-2">
        <OutlineButton
          disabled={deleting}
          label="Đăng xuất"
          onPress={() => void signOut()}
          tone="neutral"
        />
      </View>

      <ConfirmDialog
        confirmLabel="Xóa vĩnh viễn"
        destructive
        message="Toàn bộ tài khoản và dữ liệu liên quan của bạn sẽ bị xóa ngay lập tức. Hành động này không thể hoàn tác."
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => void removeAccount()}
        pending={deleting}
        title="Xóa tài khoản này?"
        visible={confirmingDelete}
      />
    </Screen>
  );
}
