import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { DangerButton, OutlineButton } from '@/components/ui/buttons';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ChoiceChips } from '@/components/ui/controls';
import { LabeledInput } from '@/components/ui/form';
import { ChevronRight } from '@/components/ui/icons';
import { ListGroup } from '@/components/ui/list-group';
import { useRefreshControl } from '@/components/ui/refresh';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { ErrorState } from '@/components/ui/states';
import { Card, SectionTitle } from '@/components/ui/typography';
import { hueIndexFor, initialOf } from '@/lib/api/present';
import { useMe, useProfile, useUpdateProfile } from '@/lib/api/queries';
import { useSession } from '@/lib/auth';
import { useAppStore } from '@/store/use-app-store';
import { uploadAvatar } from '@/lib/avatar';
import { TRAVEL_MODES } from '@/lib/ui-config';
import { SHADOWS } from '@/theme/tokens';

export default function Profile() {
  const router = useRouter();
  const {
    deleteAccount,
    displayName: sessionName,
    email,
    isGuest,
    signOut,
    syncDisplayName,
  } = useSession();
  const needsPassword = useAppStore((state) => state.needsPasswordSetup);
  const me = useMe();
  const profile = useProfile();
  const updateProfile = useUpdateProfile();

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>(null);

  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<unknown>(null);

  const refreshControl = useRefreshControl([me, profile]);

  // Hồ sơ từ API là nguồn chuẩn; giá trị trong phiên chỉ đỡ cho đến khi nó về,
  // để lời chào không nháy sang "Bạn" rồi mới đổi lại.
  const displayName = profile.data?.displayName ?? sessionName;
  const travelModeIndex = TRAVEL_MODES.findIndex(
    (mode) => mode.value === profile.data?.defaultTravelMode,
  );

  async function pickAvatar() {
    setAvatarError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    // `limited` trên iOS vẫn chọn ảnh được — đừng coi đó là từ chối.
    if (!permission.granted && permission.accessPrivileges !== 'limited') {
      setAvatarError(new Error('Mido cần quyền truy cập ảnh để đặt ảnh đại diện.'));
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    const asset = picked.canceled ? undefined : picked.assets[0];
    if (!asset) return;

    const userId = me.data?.user.id;
    if (!userId) {
      setAvatarError(new Error('Chưa xác định được tài khoản. Kéo xuống để tải lại.'));
      return;
    }

    setUploadingAvatar(true);
    try {
      const avatarUrl = await uploadAvatar(
        userId,
        { uri: asset.uri, mimeType: asset.mimeType },
        profile.data?.avatarUrl,
      );
      updateProfile.mutate({ avatarUrl });
    } catch (error) {
      setAvatarError(error);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function saveName() {
    const name = draftName.trim();
    if (!name || name === displayName) {
      setEditingName(false);
      return;
    }

    updateProfile.mutate(
      { displayName: name },
      {
        onSuccess: () => {
          setEditingName(false);
          // Kéo bản sao trong JWT theo sau bảng profiles. Không await ở đây:
          // API đã ghi xong, và màn hình không nên chờ Supabase mới đóng ô nhập.
          void syncDisplayName(name);
        },
      },
    );
  }

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
          <Pressable
            accessibilityHint="Đổi ảnh đại diện"
            accessibilityRole="button"
            className="active:opacity-70"
            disabled={uploadingAvatar}
            onPress={() => void pickAvatar()}
          >
            <Avatar
              hueIndex={hueIndexFor(me.data?.user.id ?? displayName)}
              initial={initialOf(displayName)}
              size={72}
              uri={profile.data?.avatarUrl}
            />
            <View className="absolute -bottom-1 -right-1 h-7 w-7 items-center justify-center rounded-full border-2 border-canvas bg-coral">
              {uploadingAvatar ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="font-body-bold text-[13px] leading-[15px] text-card">+</Text>
              )}
            </View>
          </Pressable>

          {editingName ? (
            <View className="w-full gap-2.5">
              <LabeledInput
                autoFocus
                label="Tên hiển thị"
                maxLength={100}
                onChangeText={setDraftName}
                onSubmitEditing={() => void saveName()}
                placeholder="Tên bạn bè nhận ra"
                returnKeyType="done"
                value={draftName}
              />
              <View className="flex-row gap-2.5">
                <OutlineButton
                  className="flex-1"
                  label="Huỷ"
                  onPress={() => setEditingName(false)}
                  tone="neutral"
                />
                <OutlineButton
                  className="flex-1"
                  disabled={updateProfile.isPending || !draftName.trim()}
                  label={updateProfile.isPending ? 'Đang lưu…' : 'Lưu'}
                  onPress={() => void saveName()}
                />
              </View>
            </View>
          ) : (
            <Pressable
              accessibilityHint="Đổi tên hiển thị"
              accessibilityRole="button"
              className="items-center gap-1 active:opacity-60"
              onPress={() => {
                setDraftName(displayName);
                setEditingName(true);
              }}
            >
              <Text className="font-heading text-[19px] text-ink">{displayName}</Text>
              <Text className="font-body-bold text-[12.5px] text-coral">Đổi tên</Text>
            </Pressable>
          )}

          {email ? <Text className="font-body text-[13.5px] text-ink-55">{email}</Text> : null}
        </View>

        {avatarError ? <ErrorState error={avatarError} title="Chưa đổi được ảnh" /> : null}
        {updateProfile.error ? (
          <ErrorState error={updateProfile.error} title="Chưa lưu được hồ sơ" />
        ) : null}

        <View className="gap-2.5 px-5 pt-8">
          <SectionTitle>Phương tiện mặc định</SectionTitle>
          <Text className="font-body text-[12.5px] leading-[19px] text-ink-50">
            Điền sẵn khi bạn nhập điểm xuất phát cho một kèo mới.
          </Text>
          <ChoiceChips
            onChange={(index) =>
              updateProfile.mutate({ defaultTravelMode: TRAVEL_MODES[index].value })
            }
            options={TRAVEL_MODES.map((mode) => mode.label)}
            size="sm"
            value={travelModeIndex}
          />
        </View>

        <View className="gap-2.5 px-5 pt-8">
          <SectionTitle>Địa điểm đã lưu</SectionTitle>
          <ListGroup
            items={[
              {
                key: 'saved-locations',
                onPress: () => router.push('/saved-locations'),
                children: (
                  <>
                    <View className="flex-1">
                      <Text className="font-body-bold text-[14.5px] text-ink">
                        Nhà, công ty, chỗ quen
                      </Text>
                      <Text className="font-body text-[12px] text-ink-45">
                        Chọn điểm xuất phát bằng một chạm
                      </Text>
                    </View>
                    <ChevronRight size={12} />
                  </>
                ),
              },
            ]}
          />
        </View>

        {me.data ? (
          <View className="px-5 pt-8">
            {/* Với khách, thẻ này là lối vào duy nhất luôn tìm thấy được của
                luồng nâng cấp — thẻ ở Home tắt được, chỗ này thì không. */}
            {me.data.user.isAnonymous || needsPassword ? (
              <Pressable
                accessibilityRole="button"
                className="active:opacity-90"
                onPress={() => router.push('/upgrade')}
              >
                <Card className="flex-row items-center gap-3 p-4" style={SHADOWS.card}>
                  <View className="flex-1 gap-1">
                    <Text className="font-body text-[12px] text-ink-45">Tài khoản</Text>
                    <Text className="font-body-bold text-[13.5px] text-ink">
                      {needsPassword ? 'Chưa đặt mật khẩu' : 'Khách (chưa đăng ký)'}
                    </Text>
                    <Text className="font-body text-[12px] leading-[18px] text-ink-55">
                      {needsPassword
                        ? 'Đặt mật khẩu để lần sau đăng nhập lại được'
                        : 'Lưu tài khoản để giữ nhóm và kèo khi đổi máy'}
                    </Text>
                  </View>
                  <ChevronRight size={12} />
                </Card>
              </Pressable>
            ) : (
              <Card className="gap-1 p-4" style={SHADOWS.card}>
                <Text className="font-body text-[12px] text-ink-45">Tài khoản</Text>
                <Text className="font-body text-[13px] text-ink">Đã đăng ký email</Text>
              </Card>
            )}
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
        {/* Khách đăng xuất là mất sạch: phiên ẩn danh không đăng nhập lại được,
            nên không có đường nào quay về dữ liệu cũ. Phải hỏi trước. */}
        <OutlineButton
          disabled={deleting}
          label="Đăng xuất"
          onPress={() => {
            if (isGuest) setConfirmingSignOut(true);
            else void signOut();
          }}
          tone="neutral"
        />
      </View>

      {/* Huỷ chỉ đóng hộp thoại, không làm gì khác: `ConfirmDialog` nối
          `onCancel` vào cả nút back của Android, nên đặt việc đăng xuất ở đó sẽ
          biến một cú vuốt lỡ tay thành mất dữ liệu. */}
      <ConfirmDialog
        cancelLabel="Ở lại"
        confirmLabel="Vẫn đăng xuất"
        destructive
        message="Bạn đang dùng thử. Đăng xuất sẽ xoá vĩnh viễn nhóm, kèo và dữ liệu công bằng của bạn trên máy này — phiên khách không đăng nhập lại được."
        onCancel={() => setConfirmingSignOut(false)}
        onConfirm={() => {
          setConfirmingSignOut(false);
          void signOut();
        }}
        title="Đăng xuất sẽ mất dữ liệu"
        visible={confirmingSignOut}
      />

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
