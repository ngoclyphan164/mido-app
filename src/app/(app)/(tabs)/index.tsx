import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/avatar';
import { ChevronRight } from '@/components/ui/icons';
import { useRefreshControl } from '@/components/ui/refresh';
import { Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { SectionTitle } from '@/components/ui/typography';
import {
  activityLabel,
  formatDayDate,
  formatTime,
  hangoutRoute,
  hueIndexFor,
  initialOf,
} from '@/lib/api/present';
import { useGroups, useHangoutDetails, useHangoutsForGroups, useMe } from '@/lib/api/queries';
import type { HangoutStatus } from '@/lib/api/types';
import { useSession } from '@/lib/auth';
import { DIAGONAL, GRADIENTS, SHADOWS, avatarColors } from '@/theme/tokens';

/** Statuses that still need the group's attention. */
const ACTIVE: HangoutStatus[] = ['draft', 'voting', 'decided'];
/** Bound on the per-hangout detail fan-out. */
const MAX_DETAILS = 8;

type TodoItem = {
  id: string;
  title: string;
  hint: string;
  tone: 'coral' | 'amber';
  href: Href;
};

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { displayName } = useSession();

  const me = useMe();
  const groups = useGroups();
  const groupIds = (groups.data ?? []).map((group) => group.id);
  const hangoutLists = useHangoutsForGroups(groupIds);

  const activeHangouts = hangoutLists
    .flatMap((query) => query.data ?? [])
    .filter((hangout) => ACTIVE.includes(hangout.status))
    .sort((a, b) => new Date(a.plannedAt).getTime() - new Date(b.plannedAt).getTime());

  const details = useHangoutDetails(activeHangouts.slice(0, MAX_DETAILS).map((h) => h.id));
  const myUserId = me.data?.user.id;

  const upcoming = activeHangouts[0];
  const upcomingDetail = details.find((query) => query.data?.id === upcoming?.id)?.data;
  const chosenName = upcomingDetail?.outing?.place?.name;

  /** Anything the signed-in member still has to do, in the design's two shapes. */
  const todo: TodoItem[] = details.flatMap((query): TodoItem[] => {
    const detail = query.data;
    if (!detail) return [];
    const joined = detail.participants.some((p) => p.userId === myUserId);
    if (!joined) {
      return [
        {
          id: detail.id,
          title: activityLabel(detail.activityType),
          hint: 'Chưa nhập vị trí xuất phát',
          tone: 'amber',
          href: `/hangout/${detail.id}/locations`,
        },
      ];
    }
    if (detail.status !== 'decided') {
      return [
        {
          id: detail.id,
          title: activityLabel(detail.activityType),
          hint: 'Đang chờ bạn bình chọn địa điểm',
          tone: 'coral',
          href: `/hangout/${detail.id}/suggestions`,
        },
      ];
    }
    return [];
  });

  // Cả cây dữ liệu của màn này: nhóm → kèo của từng nhóm → chi tiết từng kèo.
  // Kéo một lần phải làm tươi hết, không thì thẻ "Kèo sắp tới" vẫn là số cũ.
  const refreshControl = useRefreshControl([me, groups, ...hangoutLists, ...details]);

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-6"
        refreshControl={refreshControl}
      >
        <View
          className="flex-row items-center justify-between px-5"
          style={{ paddingTop: insets.top + 6 }}
        >
          <View>
            <Text className="font-body text-[13px] text-ink-50">Chào,</Text>
            <Text className="font-heading text-[21px] text-ink">{displayName}</Text>
          </View>
          <Avatar
            hueIndex={hueIndexFor(myUserId ?? displayName)}
            initial={initialOf(displayName)}
            size={40}
          />
        </View>

        {groups.isError ? (
          <ErrorState error={groups.error} onRetry={groups.refetch} />
        ) : groups.isPending ? (
          <LoadingState />
        ) : (
          <>
            {upcoming ? (
              <Pressable
                accessibilityRole="button"
                className="px-5 pt-5 active:opacity-90"
                onPress={() => router.push(hangoutRoute(upcoming.id, upcoming.status))}
              >
                <LinearGradient
                  colors={GRADIENTS.cta}
                  end={DIAGONAL.end}
                  start={DIAGONAL.start}
                  style={{ borderRadius: 20, padding: 18, ...SHADOWS.hero }}
                >
                  <Text
                    className="font-body-bold text-[12px] uppercase text-card"
                    style={{ letterSpacing: 0.6, opacity: 0.85 }}
                  >
                    Kèo sắp tới
                  </Text>
                  <Text className="mt-1.5 font-heading text-[17px] text-card">
                    {chosenName ?? activityLabel(upcoming.activityType)}
                  </Text>
                  <Text className="mt-1 font-body text-[13px] text-card" style={{ opacity: 0.9 }}>
                    {formatDayDate(upcoming.plannedAt)} · {formatTime(upcoming.plannedAt)} ·{' '}
                    {upcoming.participantCount} người
                  </Text>
                </LinearGradient>
              </Pressable>
            ) : (
              <View className="px-5 pt-5">
                <EmptyState
                  hint="Chạm dấu + để lên kèo cho nhóm."
                  title="Chưa có kèo nào sắp tới"
                />
              </View>
            )}

            {todo.length > 0 ? (
              <>
                <View className="px-5 pt-6">
                  <SectionTitle size={15}>Cần bạn xử lý</SectionTitle>
                </View>
                <View className="gap-2.5 px-5 pt-3">
                  {todo.map((item) => (
                    <Pressable
                      accessibilityRole="button"
                      className="flex-row items-center gap-3 rounded-card bg-card p-3.5 active:opacity-90"
                      key={`${item.id}-${item.hint}`}
                      onPress={() => router.push(item.href)}
                      style={SHADOWS.card}
                    >
                      <View
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: item.tone === 'coral' ? '#F0564F' : '#DEA052',
                        }}
                      />
                      <View className="flex-1">
                        <Text className="font-body-bold text-[14px] text-ink">{item.title}</Text>
                        <Text className="font-body text-[12.5px] text-ink-50">{item.hint}</Text>
                      </View>
                      <ChevronRight />
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            <View className="flex-row items-center justify-between px-5 pt-6">
              <SectionTitle size={15}>Nhóm của bạn</SectionTitle>
              <Pressable
                accessibilityRole="link"
                className="active:opacity-60"
                onPress={() => router.push('/groups')}
              >
                <Text className="font-body-bold text-[12.5px] text-coral">Xem hết</Text>
              </Pressable>
            </View>

            {groupIds.length === 0 ? (
              <View className="px-5 pt-3">
                <EmptyState hint="Tạo nhóm rồi mời bạn bè vào." title="Chưa có nhóm nào" />
              </View>
            ) : (
              <ScrollView
                contentContainerClassName="gap-3 px-5 pt-3"
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                {(groups.data ?? []).map((group) => (
                  <Pressable
                    accessibilityRole="button"
                    className="w-[120px] rounded-card bg-card p-3.5 active:opacity-90"
                    key={group.id}
                    onPress={() => router.push(`/group/${group.id}`)}
                    style={SHADOWS.card}
                  >
                    <View className="mb-2.5 flex-row">
                      {Array.from({ length: Math.min(group.memberCount, 3) }).map((_, index) => (
                        <View
                          className={index > 0 ? '-ml-2' : undefined}
                          key={index}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            borderWidth: 2,
                            borderColor: '#FFFFFF',
                            backgroundColor: avatarColors(hueIndexFor(group.id) + index).bg,
                          }}
                        />
                      ))}
                    </View>
                    <Text className="font-body-bold text-[13px] text-ink">{group.name}</Text>
                    <Text className="mt-0.5 font-body text-[11.5px] text-ink-50">
                      {group.memberCount} người
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
