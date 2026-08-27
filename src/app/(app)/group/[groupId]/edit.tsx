import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { DangerButton, PrimaryButton } from '@/components/ui/buttons';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LabeledInput } from '@/components/ui/form';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { SectionTitle } from '@/components/ui/typography';
import { useDeleteGroup, useGroup, useUpdateGroup } from '@/lib/api/queries';
import type { GroupDetail } from '@/lib/api/types';

export default function EditGroup() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const group = useGroup(groupId);

  if (group.isPending) {
    return (
      <Screen>
        <ScreenHeader title="Cài đặt nhóm" />
        <LoadingState label="Đang tải nhóm…" />
      </Screen>
    );
  }

  if (group.isError || !group.data) {
    return (
      <Screen>
        <ScreenHeader title="Cài đặt nhóm" />
        <ErrorState error={group.error} onRetry={group.refetch} />
      </Screen>
    );
  }

  // Keyed on the loaded group so the name field starts from server state
  // instead of needing an effect to sync it.
  return <EditGroupForm group={group.data} key={group.data.id} />;
}

function EditGroupForm({ group }: { group: GroupDetail }) {
  const router = useRouter();
  const [name, setName] = useState(group.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const updateGroup = useUpdateGroup(group.id);
  const deleteGroup = useDeleteGroup(group.id);

  // The API allows owner/admin to rename, but only the owner to delete.
  const canRename = group.role === 'owner' || group.role === 'admin';
  const canDelete = group.role === 'owner';

  const trimmed = name.trim();
  const dirty = trimmed !== group.name;
  const busy = updateGroup.isPending || deleteGroup.isPending;

  function save() {
    updateGroup.mutate(trimmed, { onSuccess: () => router.back() });
  }

  function remove() {
    deleteGroup.mutate(undefined, {
      onSuccess: () => {
        setConfirmingDelete(false);
        // The group is gone, so neither this screen nor the group detail below
        // it may stay on the stack — both would land on a 404.
        if (router.canDismiss()) router.dismissAll();
        router.replace('/groups');
      },
    });
  }

  return (
    <Screen>
      <ScreenHeader subtitle={`${group.memberCount} thành viên`} title="Cài đặt nhóm" />

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-6"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-2 px-5 pt-6">
          <LabeledInput
            autoCapitalize="sentences"
            editable={canRename && !busy}
            label="Tên nhóm"
            maxLength={120}
            onChangeText={setName}
            placeholder="Hội cà phê cuối tuần"
            value={name}
          />
          <Text className="font-body text-[13px] leading-[20px] text-ink-55">
            {canRename
              ? 'Mọi thành viên sẽ thấy tên mới ngay lập tức.'
              : 'Chỉ chủ nhóm hoặc quản trị viên mới đổi được tên nhóm.'}
          </Text>
        </View>

        {updateGroup.error ? <ErrorState error={updateGroup.error} /> : null}

        {canDelete ? (
          <View className="gap-2.5 px-5 pt-9">
            <SectionTitle>Xoá nhóm</SectionTitle>
            <Text className="font-body text-[13px] leading-[20px] text-ink-55">
              Xoá nhóm sẽ xoá luôn toàn bộ kèo, bình chọn và sổ công bằng của nhóm. Không thể hoàn
              tác.
            </Text>
            <DangerButton
              disabled={busy}
              label={deleteGroup.isPending ? 'Đang xoá…' : 'Xoá nhóm'}
              onPress={() => setConfirmingDelete(true)}
            />
            {deleteGroup.error ? <ErrorState error={deleteGroup.error} /> : null}
          </View>
        ) : null}
      </ScrollView>

      {canRename ? (
        <View className="px-5 pb-8 pt-5">
          <PrimaryButton
            disabled={!dirty || trimmed.length === 0 || busy}
            label={updateGroup.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
            onPress={save}
          />
        </View>
      ) : null}

      <ConfirmDialog
        confirmLabel="Xoá nhóm"
        destructive
        message={`"${group.name}" và toàn bộ kèo, bình chọn, sổ công bằng của nhóm sẽ bị xoá vĩnh viễn.`}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={remove}
        pending={deleteGroup.isPending}
        title="Xoá nhóm này?"
        visible={confirmingDelete}
      />
    </Screen>
  );
}
