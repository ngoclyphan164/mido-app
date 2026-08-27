import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/avatar';
import { OutlineButton, PrimaryButton } from '@/components/ui/buttons';
import { Check } from '@/components/ui/icons';
import { MapPreview } from '@/components/ui/map-preview';
import { useRefreshControl } from '@/components/ui/refresh';
import { BackButton, Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Card, SectionTitle } from '@/components/ui/typography';
import { formatDayDate, formatTime, hueIndexFor, initialOf, minutesOf } from '@/lib/api/present';
import { useCompleteHangout, useHangout } from '@/lib/api/queries';
import { SHADOWS } from '@/theme/tokens';

export default function Confirmed() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { hangoutId } = useLocalSearchParams<{ hangoutId: string }>();

  const hangout = useHangout(hangoutId);
  const detail = hangout.data;
  /** Snapshot của API — thứ duy nhất còn lại sau khi đóng app hoặc đổi máy. */
  const venue = detail?.outing?.place;
  const complete = useCompleteHangout(hangoutId, detail?.groupId);
  // Kéo để thử lại khi API chưa lấy được snapshot địa điểm.
  const refreshControl = useRefreshControl([hangout]);

  const [editing, setEditing] = useState(false);
  /**
   * Seeded from the route estimate purely as a starting point. The API refuses
   * to persist estimates, so these have to be confirmed or corrected by hand
   * before they reach the fairness ledger.
   */
  const [minutes, setMinutes] = useState<Record<string, number>>({});

  const seeded = useMemo(() => {
    if (!venue) return {};
    return Object.fromEntries(
      venue.travelTimes.map((travel) => [travel.participantId, minutesOf(travel.durationSec)]),
    );
  }, [venue]);

  const values = Object.keys(minutes).length > 0 ? minutes : seeded;

  function bump(participantId: string, delta: number) {
    setMinutes({
      ...values,
      [participantId]: Math.max(0, (values[participantId] ?? 0) + delta),
    });
  }

  if (hangout.isPending) {
    return (
      <Screen>
        <View className="flex-row items-center gap-3 px-5" style={{ paddingTop: insets.top + 6 }}>
          <BackButton />
        </View>
        <LoadingState label="Đang tải kèo…" />
      </Screen>
    );
  }

  if (hangout.isError || !detail) {
    return (
      <Screen>
        <View className="flex-row items-center gap-3 px-5" style={{ paddingTop: insets.top + 6 }}>
          <BackButton />
        </View>
        <ErrorState error={hangout.error} onRetry={hangout.refetch} />
      </Screen>
    );
  }

  const decided = Boolean(detail.outing);

  return (
    <Screen>
      <View className="flex-row items-center gap-3 px-5" style={{ paddingTop: insets.top + 6 }}>
        <BackButton />
        <Text className="font-heading text-[20px] leading-[26px] text-ink">
          {detail.status === 'done' ? 'Đã đi xong!' : 'Đã chốt!'}
        </Text>
        {decided ? (
          <View className="h-[22px] w-[22px] items-center justify-center rounded-full bg-check-bg">
            <Check size={9} />
          </View>
        ) : null}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-4"
        refreshControl={refreshControl}
      >
        {venue ? (
          <View className="px-5 pt-5">
            <Card className="rounded-place p-4" style={SHADOWS.card}>
              <Text className="font-heading text-[17px] text-ink">{venue.name}</Text>
              {venue.address ? (
                <Text className="mt-1 font-body text-[13px] text-ink-55">{venue.address}</Text>
              ) : null}
              <Text className="mt-1 font-body text-[13px] text-ink-55">
                {formatDayDate(detail.plannedAt)} · {formatTime(detail.plannedAt)}
              </Text>
              {venue.mapsUri ? (
                <Pressable
                  accessibilityRole="link"
                  className="mt-0.5 active:opacity-60"
                  onPress={() => void WebBrowser.openBrowserAsync(venue.mapsUri!)}
                >
                  <Text className="font-body-bold text-[13px] text-coral">Mở trong bản đồ</Text>
                </Pressable>
              ) : null}
              <MapPreview
                className="mt-3"
                coord={{ lat: venue.location.lat, lng: venue.location.lng }}
                height={120}
                radius={14}
              />
            </Card>
          </View>
        ) : (
          <EmptyState
            hint="API chưa lấy được thông tin quán từ nhà cung cấp. Kéo xuống tải lại giúp mình."
            title="Không còn thông tin quán"
          />
        )}

        <View className="px-5 pt-[22px]">
          <SectionTitle className="mb-2.5" size={14}>
            {`Người tham gia (${detail.participants.length})`}
          </SectionTitle>
          <View className="gap-2">
            {detail.participants.map((participant) => (
              <View className="flex-row items-center gap-2.5" key={participant.id}>
                <Avatar
                  hueIndex={hueIndexFor(participant.userId)}
                  initial={initialOf(participant.displayName)}
                  size={30}
                />
                <Text className="flex-1 font-body text-[13.5px] text-ink">
                  {participant.displayName}
                </Text>
                {editing ? (
                  <View className="flex-row items-center gap-2">
                    <Pressable
                      accessibilityLabel="Giảm"
                      className="h-7 w-7 items-center justify-center rounded-full bg-chip active:opacity-70"
                      onPress={() => bump(participant.id, -1)}
                    >
                      <Text className="font-body-bold text-[15px] text-coral-dark">−</Text>
                    </Pressable>
                    <Text className="w-16 text-center font-body-bold text-[13px] text-ink">
                      {values[participant.id] ?? 0} phút
                    </Text>
                    <Pressable
                      accessibilityLabel="Tăng"
                      className="h-7 w-7 items-center justify-center rounded-full bg-chip active:opacity-70"
                      onPress={() => bump(participant.id, 1)}
                    >
                      <Text className="font-body-bold text-[15px] text-coral-dark">+</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text className="font-body-bold text-[11.5px] text-success-strong">
                    Đã nhập vị trí
                  </Text>
                )}
              </View>
            ))}
            {detail.pendingMembers.map((member) => (
              <View className="flex-row items-center gap-2.5" key={member.userId}>
                <Avatar
                  hueIndex={hueIndexFor(member.userId)}
                  initial={initialOf(member.displayName)}
                  size={30}
                />
                <Text className="flex-1 font-body text-[13.5px] text-ink">
                  {member.displayName}
                </Text>
                <Text className="font-body-bold text-[11.5px] text-ink-40">Chưa tham gia</Text>
              </View>
            ))}
          </View>
          {editing ? (
            <Text className="mt-3 font-body text-[12px] leading-[18px] text-ink-45">
              Số phút bắt đầu từ ước tính tuyến đường. Sửa lại cho đúng thực tế trước khi ghi, vì
              chỉ số thực tế mới được vào sổ công bằng.
            </Text>
          ) : null}
          {complete.error ? <ErrorState error={complete.error} /> : null}
        </View>
      </ScrollView>

      <View className="gap-2.5 px-5 pb-8 pt-[18px]">
        {detail.status === 'done' ? (
          <PrimaryButton
            label="Xem sổ công bằng"
            onPress={() => router.replace(`/group/${detail.groupId}`)}
          />
        ) : editing ? (
          <>
            <OutlineButton label="Huỷ" onPress={() => setEditing(false)} tone="neutral" />
            <PrimaryButton
              disabled={complete.isPending || detail.participants.length < 2}
              label={complete.isPending ? 'Đang ghi nhận…' : 'Ghi nhận vào sổ công bằng'}
              onPress={() =>
                complete.mutate(
                  {
                    happenedAt: new Date().toISOString(),
                    actualTravelTimes: detail.participants.map((participant) => ({
                      participantId: participant.id,
                      durationSec: (values[participant.id] ?? 0) * 60,
                    })),
                  },
                  { onSuccess: () => setEditing(false) },
                )
              }
            />
          </>
        ) : (
          <PrimaryButton label="Đã đi xong? Ghi nhận thời gian" onPress={() => setEditing(true)} />
        )}
      </View>
    </Screen>
  );
}
