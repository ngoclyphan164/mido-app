import { Pressable, Text, View } from 'react-native';

import { ChevronRight } from '@/components/ui/icons';
import { PlaceImage } from '@/components/ui/place-image';
import { placeMeta, travelSummary } from '@/lib/api/present';
import type { StoredSuggestion } from '@/lib/api/types';
import { cn } from '@/lib/cn';
import { SHADOWS } from '@/theme/tokens';

/**
 * Suggestion row. The top-ranked option gets a coral outline, a coral glow and
 * a "Phù hợp nhất" badge that hangs over the card's top edge.
 */
export function PlaceCard({
  suggestion,
  featured = false,
  onPress,
}: {
  suggestion: StoredSuggestion;
  featured?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className={cn(
        'rounded-place bg-card p-3.5 active:opacity-90',
        featured && 'border-[1.5px] border-coral',
      )}
      onPress={onPress}
      style={featured ? SHADOWS.recommended : SHADOWS.card}
    >
      {featured ? (
        <View className="absolute -top-2.5 left-3.5 rounded-full bg-coral px-2.5 py-1">
          <Text className="font-body-bold text-[10.5px] text-card">Phù hợp nhất</Text>
        </View>
      ) : null}

      <View className={cn('flex-row gap-3', featured && 'mt-1.5')}>
        <PlaceImage
          accessibilityLabel={`Ảnh ${suggestion.name}`}
          className="h-14 w-14"
          uri={suggestion.images[0]}
        />
        <View className="min-w-0 flex-1">
          <Text className="font-heading text-[15px] text-ink">{suggestion.name}</Text>
          <Text className="mt-0.5 font-body text-[12.5px] text-ink-55">
            {placeMeta(suggestion)}
          </Text>
          <Text className="mt-1 font-body text-[12.5px] text-ink-55">
            {travelSummary(suggestion.travelTimes)}
          </Text>
        </View>
        <View className="mt-5">
          <ChevronRight />
        </View>
      </View>
    </Pressable>
  );
}
