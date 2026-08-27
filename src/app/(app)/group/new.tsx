import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { PrimaryButton } from '@/components/ui/buttons';
import { SegmentedControl } from '@/components/ui/controls';
import { LabeledInput } from '@/components/ui/form';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { ErrorState } from '@/components/ui/states';
import { Card, FieldLabel, MonoText } from '@/components/ui/typography';
import { hueIndexFor, initialOf } from '@/lib/api/present';
import { useCreateGroup, useJoinGroup } from '@/lib/api/queries';
import type { CreateGroupResponse } from '@/lib/api/types';
import { SHADOWS } from '@/theme/tokens';

export default function NewGroup() {
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();

  const [mode, setMode] = useState(tab === 'join' ? 1 : 0);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  /** The API returns the raw invite code exactly once, on create. */
  const [created, setCreated] = useState<CreateGroupResponse | null>(null);

  const createGroup = useCreateGroup();
  const joinGroup = useJoinGroup();
  const joining = mode === 1;

  const inviteUrl = created ? `mido.app/join/${created.inviteCode}` : null;

  async function copyInvite() {
    if (!inviteUrl) return;
    await Clipboard.setStringAsync(`https://${inviteUrl}`);
    setCopied(true);
  }

  function submit() {
    if (joining) {
      joinGroup.mutate(code, {
        onSuccess: (result) => router.replace(`/group/${result.group.id}`),
      });
      return;
    }
    if (created) {
      router.push(`/group/${created.group.id}/hangout/new`);
      return;
    }
    createGroup.mutate({ name: name.trim() }, { onSuccess: setCreated });
  }

  const pending = createGroup.isPending || joinGroup.isPending;
  const error = createGroup.error ?? joinGroup.error;

  const ctaLabel = joining ? 'Vào nhóm' : created ? 'Tiếp tục · Tạo kèo' : 'Tạo nhóm';
  const ctaDisabled = pending || (joining ? code.trim().length < 4 : !created && !name.trim());

  return (
    <Screen>
      <ScreenHeader title="Nhóm của bạn" />

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-6"
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-5 pt-5">
          <SegmentedControl
            onChange={(next) => {
              setMode(next);
              setCreated(null);
            }}
            options={['Tạo nhóm mới', 'Nhập mã mời']}
            value={mode}
          />
        </View>

        {joining ? (
          <View className="gap-2 px-5 pt-6">
            <LabeledInput
              autoCapitalize="characters"
              autoCorrect={false}
              label="Mã mời"
              onChangeText={setCode}
              placeholder="8F2KQ4RT"
              value={code}
            />
            <Text className="font-body text-[13px] leading-[20px] text-ink-55">
              Nhập mã bạn nhận được. Gõ hoa hay thường đều được.
            </Text>
          </View>
        ) : (
          <>
            <View className="px-5 pt-6">
              <LabeledInput
                editable={!created}
                label="Tên nhóm"
                onChangeText={setName}
                placeholder="Hội cà phê cuối tuần"
                value={created ? created.group.name : name}
              />
            </View>

            {created ? (
              <>
                <View className="gap-2.5 px-5 pt-6">
                  <FieldLabel>Thành viên</FieldLabel>
                  <View className="flex-row items-center gap-2.5">
                    {created.group.members.map((member) => (
                      <Avatar
                        hueIndex={hueIndexFor(member.userId)}
                        initial={initialOf(member.displayName)}
                        key={member.userId}
                        size={40}
                      />
                    ))}
                  </View>
                </View>

                <View className="gap-2 px-5 pt-6">
                  <FieldLabel>Mời bạn bè</FieldLabel>
                  <Card
                    className="flex-row items-center justify-between px-4 py-3.5"
                    style={SHADOWS.field}
                  >
                    <MonoText className="text-[14px] text-ink">{inviteUrl ?? ''}</MonoText>
                    <Pressable
                      accessibilityRole="button"
                      className="active:opacity-60"
                      onPress={copyInvite}
                    >
                      <Text className="font-body-bold text-[12.5px] text-coral">
                        {copied ? 'Đã sao chép' : 'Sao chép'}
                      </Text>
                    </Pressable>
                  </Card>
                  <Text className="font-body text-[13px] leading-[20px] text-ink-55">
                    Lưu link này lại: server chỉ giữ bản hash nên mã cũ không đọc lại được, muốn
                    hiện lại phải tạo mã mới.
                  </Text>
                </View>
              </>
            ) : (
              <View className="px-5 pt-6">
                <Text className="font-body text-[13px] leading-[20px] text-ink-55">
                  Link mời sẽ hiện ra ngay sau khi tạo nhóm.
                </Text>
              </View>
            )}
          </>
        )}

        {error ? <ErrorState error={error} /> : null}
      </ScrollView>

      <View className="px-5 pb-8 pt-5">
        <PrimaryButton
          disabled={ctaDisabled}
          label={pending ? 'Đang xử lý…' : ctaLabel}
          onPress={submit}
        />
      </View>
    </Screen>
  );
}
