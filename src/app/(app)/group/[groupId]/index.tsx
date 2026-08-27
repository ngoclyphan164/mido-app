import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { PrimaryButton } from '@/components/ui/buttons';
import { SegmentedControl, StatusPill } from '@/components/ui/controls';
import { ChevronRight, MoreDots } from '@/components/ui/icons';
import { ListGroup } from '@/components/ui/list-group';
import { useRefreshControl } from '@/components/ui/refresh';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Card, FieldLabel, MonoText, SectionTitle } from '@/components/ui/typography';
import {
  activityLabel,
  fairnessBalance,
  formatShortDate,
  hangoutRoute,
  hangoutStatusLabel,
  hueIndexFor,
  initialOf,
  outingsLabel,
} from '@/lib/api/present';
import { useGroup, useGroupFairness, useGroupHangouts, useRotateInvite } from '@/lib/api/queries';
import { SHADOWS } from '@/theme/tokens';

export default function GroupDetail() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  // The design shows the fairness ledger selected.
  const [tab, setTab] = useState(1);
  const [inviteCopied, setInviteCopied] = useState(false);

  const group = useGroup(groupId);
  const fairness = useGroupFairness(groupId);
  const hangouts = useGroupHangouts(groupId);
  const rotateInvite = useRotateInvite(groupId);

  const canManageInvite = group.data?.role === 'owner' || group.data?.role === 'admin';
  const inviteCode = rotateInvite.data?.inviteCode;

  async function copyInviteCode() {
    if (!inviteCode) return;
    const copied = await Clipboard.setStringAsync(inviteCode);
    setInviteCopied(copied);
  }

  const refreshControl = useRefreshControl([group, fairness, hangouts]);

  const outingRows = (hangouts.data ?? []).map((hangout) => ({
    key: hangout.id,
    onPress: () => router.push(hangoutRoute(hangout.id, hangout.status)),
    children: (
      <>
        <Text className="flex-1 font-body text-[13.5px] text-ink">
          {activityLabel(hangout.activityType)} · {formatShortDate(hangout.plannedAt)} ·{' '}
          {hangoutStatusLabel(hangout.status)}
        </Text>
        <ChevronRight size={12} />
      </>
    ),
  }));

  return (
    <Screen>
      <ScreenHeader
        right={
          canManageInvite ? (
            <Pressable
              accessibilityLabel="Cài đặt nhóm"
              accessibilityRole="button"
              className="h-9 w-9 items-center justify-center rounded-full bg-card active:opacity-70"
              hitSlop={8}
              onPress={() => router.push(`/group/${groupId}/edit`)}
              style={SHADOWS.pill}
            >
              <MoreDots />
            </Pressable>
          ) : null
        }
        subtitle={group.data ? `${group.data.memberCount} thành viên` : undefined}
        title={group.data?.name ?? 'Nhóm'}
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        refreshControl={refreshControl}
      >
        <View className="px-5 pt-[18px]">
          <SegmentedControl onChange={setTab} options={['Hoạt động', 'Sổ công bằng']} value={tab} />
        </View>

        {group.data ? (
          <View className="px-5 pt-4">
            <Card className="gap-3 p-4" style={SHADOWS.card}>
              <View className="gap-1">
                <FieldLabel>Mã mời nhóm</FieldLabel>
                <Text className="font-body text-[12.5px] leading-[18px] text-ink-50">
                  {inviteCode
                    ? 'Gửi mã này cho bạn bè để họ tham gia nhóm.'
                    : canManageInvite
                      ? 'Vì lý do bảo mật, mã hiện tại không thể đọc lại. Tạo mã mới sẽ làm mã cũ hết hiệu lực.'
                      : 'Chỉ chủ nhóm hoặc quản trị viên mới có thể tạo mã mời mới.'}
                </Text>
              </View>

              {rotateInvite.data ? (
                <>
                  <View className="flex-row items-center justify-between rounded-[14px] bg-canvas px-4 py-3.5">
                    <MonoText className="text-[18px] text-ink">
                      {rotateInvite.data.inviteCode}
                    </MonoText>
                    <Pressable
                      accessibilityRole="button"
                      className="active:opacity-60"
                      onPress={() => void copyInviteCode()}
                    >
                      <Text className="font-body-bold text-[12.5px] text-coral">
                        {inviteCopied ? 'Đã sao chép' : 'Sao chép'}
                      </Text>
                    </Pressable>
                  </View>
                  <Text className="font-body text-[11.5px] text-ink-45">
                    Hết hạn lúc{' '}
                    {new Intl.DateTimeFormat('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(rotateInvite.data.inviteExpiresAt))}
                  </Text>
                </>
              ) : canManageInvite ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: rotateInvite.isPending }}
                  className="items-center rounded-full bg-coral-soft py-3 active:opacity-70 disabled:opacity-50"
                  disabled={rotateInvite.isPending}
                  onPress={() => {
                    setInviteCopied(false);
                    rotateInvite.mutate(undefined);
                  }}
                >
                  <Text className="font-heading text-[13.5px] text-coral-dark">
                    {rotateInvite.isPending ? 'Đang tạo mã…' : 'Tạo mã mời mới'}
                  </Text>
                </Pressable>
              ) : null}

              {rotateInvite.isError ? (
                <Text className="font-body text-[12px] text-coral-dark">
                  Không tạo được mã mời. Hãy thử lại.
                </Text>
              ) : null}
            </Card>
          </View>
        ) : null}

        {group.isError ? (
          <ErrorState error={group.error} onRetry={group.refetch} />
        ) : tab === 1 ? (
          <>
            <View className="px-5 pt-4">
              <Text className="font-body text-[12.5px] leading-[19px] text-ink-50">
                Ai đã đi xa hơn được ưu tiên gần hơn ở lần sau.
              </Text>
            </View>

            {fairness.isPending ? (
              <LoadingState label="Đang tính sổ công bằng…" />
            ) : fairness.isError ? (
              <ErrorState error={fairness.error} onRetry={fairness.refetch} />
            ) : (
              <View className="px-5 pt-3.5">
                <ListGroup
                  items={(fairness.data?.members ?? []).map((member) => {
                    const balance = fairnessBalance(member.debtSeconds);
                    return {
                      key: member.userId,
                      children: (
                        <>
                          <Avatar
                            hueIndex={hueIndexFor(member.userId)}
                            initial={initialOf(member.displayName)}
                          />
                          <View className="flex-1">
                            <Text className="font-body-bold text-[14.5px] text-ink">
                              {member.displayName}
                            </Text>
                            <Text className="font-body text-[12px] text-ink-45">
                              {outingsLabel(member.outingsCompleted)}
                            </Text>
                          </View>
                          <StatusPill label={balance.label} tone={balance.tone} />
                        </>
                      ),
                    };
                  })}
                />
              </View>
            )}

            <View className="px-5 pt-[22px]">
              <SectionTitle className="mb-2.5" size={14}>
                Kèo gần đây
              </SectionTitle>
              {outingRows.length > 0 ? (
                <ListGroup items={outingRows} radius={14} />
              ) : (
                <Text className="font-body text-[13px] text-ink-55">Chưa có kèo nào.</Text>
              )}
            </View>
          </>
        ) : (
          <View className="gap-4 px-5 pt-4">
            <SectionTitle size={14}>Kèo gần đây</SectionTitle>
            {hangouts.isPending ? (
              <LoadingState />
            ) : hangouts.isError ? (
              <ErrorState error={hangouts.error} onRetry={hangouts.refetch} />
            ) : outingRows.length > 0 ? (
              <ListGroup items={outingRows} radius={14} />
            ) : (
              <EmptyState hint="Tạo kèo đầu tiên cho nhóm." title="Chưa có kèo nào" />
            )}
            <PrimaryButton
              label="Tạo kèo mới"
              onPress={() => router.push(`/group/${groupId}/hangout/new`)}
            />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
