import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { cn } from '@/lib/cn';
import { CATEGORIES } from '@/lib/ui-config';
import { DIAGONAL, GRADIENTS, SHADOWS } from '@/theme/tokens';

/**
 * Horizontal row of activity tiles, shared by the create and edit kèo screens.
 * `value` is an index into CATEGORIES; -1 means the kèo carries an activity the
 * picker doesn't offer (the API supports a few more keys than the design does),
 * in which case nothing is highlighted until the user picks one.
 */
export function CategoryPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (index: number) => void;
}) {
  return (
    <ScrollView
      contentContainerClassName="gap-3.5 px-5 pb-1"
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {CATEGORIES.map((category, index) => {
        const active = index === value;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            className="items-center gap-1.5 active:opacity-70"
            key={category.key}
            onPress={() => onChange(index)}
          >
            {active ? (
              <LinearGradient
                colors={GRADIENTS.categoryActive}
                end={DIAGONAL.end}
                start={DIAGONAL.start}
                style={{ width: 52, height: 52, borderRadius: 16, ...SHADOWS.chipActive }}
              />
            ) : (
              <View
                className="h-[52px] w-[52px] rounded-[16px]"
                style={{ backgroundColor: category.tile, ...SHADOWS.field }}
              />
            )}
            <Text
              className={cn(
                'text-[12px]',
                active ? 'font-body-bold text-coral-dark' : 'font-body-semibold text-ink-55',
              )}
            >
              {category.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
