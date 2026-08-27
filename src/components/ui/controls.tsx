import { Pressable, Text, View } from 'react-native';

import { cn } from '@/lib/cn';
import { SHADOWS } from '@/theme/tokens';

/**
 * Two-up pill switch on a `#FFEDE7` track — used for create/join and for the
 * activity/ledger tabs.
 */
export function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: number;
  onChange: (index: number) => void;
}) {
  return (
    <View className="flex-row gap-1 rounded-full bg-chip p-1">
      {options.map((option, index) => {
        const active = index === value;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={cn(
              'flex-1 items-center rounded-full py-2.5',
              active ? 'bg-card' : 'active:opacity-60',
            )}
            key={option}
            onPress={() => onChange(index)}
            style={active ? SHADOWS.pill : undefined}
          >
            <Text
              className={cn(
                'font-heading text-[13.5px]',
                active ? 'text-coral-dark' : 'text-ink-45',
              )}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Row of equal-width choice chips. `size` matches the two densities in the
 * design: 13px/10px padding for the travel-time row, 12.5px/9px for transport.
 */
export function ChoiceChips({
  options,
  value,
  onChange,
  size = 'md',
}: {
  options: string[];
  value: number;
  onChange: (index: number) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <View className="flex-row gap-2">
      {options.map((option, index) => {
        const active = index === value;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            className={cn(
              'flex-1 items-center rounded-chip',
              size === 'md' ? 'py-2.5' : 'py-[9px]',
              active ? 'bg-coral' : 'bg-card active:opacity-70',
            )}
            key={option}
            onPress={() => onChange(index)}
            style={active ? (size === 'md' ? SHADOWS.chipActive : undefined) : SHADOWS.field}
          >
            <Text
              className={cn(
                'font-body-bold',
                size === 'md' ? 'text-[13px]' : 'text-[12.5px]',
                active ? 'text-card' : 'text-ink-60',
              )}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Small status pill: neutral, green (ahead) or amber (owed) fairness balance. */
export function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: 'neutral' | 'success' | 'amber';
}) {
  const toneClass = {
    neutral: 'bg-ink-06',
    success: 'bg-success-bg',
    amber: 'bg-amber-bg',
  }[tone];
  const textClass = {
    neutral: 'text-ink-50',
    success: 'text-success',
    amber: 'text-amber',
  }[tone];

  return (
    <View className={cn('rounded-full px-2.5 py-[5px]', toneClass)}>
      <Text className={cn('font-body-bold text-[12px]', textClass)}>{label}</Text>
    </View>
  );
}
