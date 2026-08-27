import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/avatar';
import { PrimaryButton } from '@/components/ui/buttons';
import { PlaceImage } from '@/components/ui/place-image';
import { useRefreshControl } from '@/components/ui/refresh';
import { BackButton, Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { SectionTitle } from '@/components/ui/typography';
import { formatMinutes, hueIndexFor, initialOf, placeMeta, spreadMinutes } from '@/lib/api/present';
import {
  useCastVote,
  useDecideHangout,
  useStoredSuggestion,
  useSuggestionVotesRealtime,
} from '@/lib/api/queries';
import { TRAVEL_MODE_LABELS, type VoteValue } from '@/lib/api/types';
import { cn } from '@/lib/cn';

import { SHADOWS } from '@/theme/tokens';

const VOTE_OPTIONS = [
  { key: 'up', label: 'Thích', tone: 'text-ink-55' },
  { key: 'down', label: 'Không hợp', tone: 'text-ink-55' },
  { key: 'veto', label: 'Loại', tone: 'text-danger' },
] as const;

export default function PlaceDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { hangoutId, suggestionId } = useLocalSearchParams<{
    hangoutId: string;
    suggestionId: string;
  }>();

  // Từ database chứ không phải cache trên máy: mở lại app, đổi máy, hay người
  // khác trong nhóm mở lên đều thấy đúng quán này.
  const stored = useStoredSuggestion(hangoutId, suggestionId);
  useSuggestionVotesRealtime(hangoutId, suggestionId);
  const suggestion = stored.data;
  const castVote = useCastVote(hangoutId);
  const decide = useDecideHangout(hangoutId);
  const [myVote, setMyVote] = useState<VoteValue | null>(null);
  // Realtime tự cập nhật tally; pull-to-refresh vẫn là đường lui khi mất mạng.
  const refreshControl = useRefreshControl([stored]);

  if (!suggestion && stored.isPending) {
    return (
      <Screen>
        <View className="flex-row items-center gap-3 px-5" style={{ paddingTop: insets.top + 6 }}>
          <BackButton />
        </View>
        <LoadingState />
      </Screen>
    );
  }

  if (!suggestion) {
    return (
      <Screen>
        <View className="flex-row items-center gap-3 px-5" style={{ paddingTop: insets.top + 6 }}>
          <BackButton />
        </View>
        <EmptyState
          hint="Gợi ý này không còn trong danh sách của kèo. Quay lại và tìm lại giúp mình."
          title="Không còn gợi ý này"
        />
      </Screen>
    );
  }

  const spread = spreadMinutes(suggestion.travelTimes);
  const tally = suggestion.tally;

  return (
    <Screen>
      <View className="h-[170px] overflow-hidden">
        {suggestion.images.length > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={{ flex: 1 }}
          >
            {suggestion.images.map((uri, index) => (
              <PlaceImage
                accessibilityLabel={`Ảnh ${index + 1} của ${suggestion.name}`}
                key={`${uri}:${index}`}
                radius={0}
                style={{ height: 170, width }}
                uri={uri}
              />
            ))}
          </ScrollView>
        ) : (
          <PlaceImage
            accessibilityLabel={`Ảnh ${suggestion.name}`}
            className="absolute inset-0"
            radius={0}
          />
        )}
        {suggestion.images.length > 1 ? (
          <View className="absolute bottom-3 right-4 rounded-full bg-ink/70 px-2.5 py-1">
            <Text className="font-body-bold text-[11px] text-card">
              {suggestion.images.length} ảnh
            </Text>
          </View>
        ) : null}
        <View className="absolute left-4" style={{ top: insets.top + 8 }}>
          <BackButton />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-4"
        refreshControl={refreshControl}
      >
        <View className="px-5 pt-4">
          <Text className="font-heading text-[19px] text-ink">{suggestion.name}</Text>
          <Text className="mt-1 font-body text-[12.5px] text-ink-55">
            {placeMeta(suggestion, { withReviewCount: true })}
          </Text>
        </View>

        <View className="px-5 pt-[22px]">
          <SectionTitle className="mb-2.5" size={14}>
            Thời gian di chuyển từng người
          </SectionTitle>
          <View className="gap-2">
            {suggestion.travelTimes.map((travel) => (
              <View className="flex-row items-center gap-2.5" key={travel.participantId}>
                <Avatar
                  hueIndex={hueIndexFor(travel.participantId)}
                  initial={initialOf(travel.name)}
                  size={28}
                />
                <Text className="flex-1 font-body text-[13.5px] text-ink">
                  {travel.name} · {TRAVEL_MODE_LABELS[travel.mode]}
                </Text>
                <Text className="font-body-bold text-[13.5px] text-ink">
                  {formatMinutes(travel.durationSec)}
                </Text>
              </View>
            ))}
          </View>
          <Text className="mt-2.5 font-body text-[12px] text-ink-45">
            Chênh lệch xa nhất: {spread} phút
          </Text>
        </View>

        <View className="px-5 pt-[22px]">
          <SectionTitle className="mb-2.5" size={14}>
            Bình chọn cả nhóm
          </SectionTitle>
          <View className="flex-row gap-2">
            {VOTE_OPTIONS.map((option) => {
              const active = myVote === option.key;
              const count = tally ? tally[option.key] : undefined;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  className={cn(
                    'flex-1 items-center rounded-chip py-[11px]',
                    active ? 'bg-coral' : 'bg-card active:opacity-70',
                  )}
                  key={option.key}
                  onPress={() => {
                    setMyVote(option.key);
                    castVote.mutate({ suggestionId, value: option.key });
                  }}
                  style={active ? undefined : SHADOWS.field}
                >
                  <Text
                    className={cn('font-body-bold text-[13px]', active ? 'text-card' : option.tone)}
                  >
                    {option.label}
                    {count === undefined ? '' : ` · ${count}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {castVote.error ? <ErrorState error={castVote.error} /> : null}
          {decide.error ? <ErrorState error={decide.error} /> : null}
        </View>
      </ScrollView>

      <View className="flex-row items-center gap-3 border-t border-ink-08 px-5 pb-[30px] pt-4">
        <Text className="flex-1 font-body text-[12px] text-ink-50">
          {tally ? `${tally.total}/${suggestion.travelTimes.length} đã vote` : 'Chưa ai vote'}
        </Text>
        <PrimaryButton
          compact
          disabled={decide.isPending}
          label={decide.isPending ? 'Đang chốt…' : 'Chốt địa điểm này'}
          onPress={() =>
            decide.mutate(suggestionId, {
              // Replace, not push: the kèo is decided now, so backing up onto a
              // place screen that still offers "Chốt địa điểm này" is a dead end.
              onSuccess: () => router.replace(`/hangout/${hangoutId}/confirmed`),
            })
          }
        />
      </View>
    </Screen>
  );
}
