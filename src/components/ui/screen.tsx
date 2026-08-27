import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronLeft } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { SHADOWS } from '@/theme/tokens';

export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return <View className={cn('flex-1 bg-canvas', className)}>{children}</View>;
}

/** Round white back control — 36px circle with the design's soft pill shadow. */
export function BackButton({ onPress }: { onPress?: () => void }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityLabel="Quay lại"
      accessibilityRole="button"
      className="h-9 w-9 items-center justify-center rounded-full bg-card active:opacity-70"
      hitSlop={8}
      onPress={onPress ?? (() => router.back())}
      style={SHADOWS.pill}
    >
      <ChevronLeft />
    </Pressable>
  );
}

/**
 * Screen title row. The design starts content at 60px from the frame top,
 * which sits flush under the status bar — so the safe-area inset replaces it.
 */
export function ScreenHeader({
  title,
  subtitle,
  back = true,
  right,
  titleSize = 20,
  onBack,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  titleSize?: number;
  /** Overrides the default `router.back()`. */
  onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View className="px-5" style={{ paddingTop: insets.top + 6 }}>
      <View className="flex-row items-center gap-3">
        {back ? <BackButton onPress={onBack} /> : null}
        <Text
          className="flex-1 font-heading text-ink"
          style={{ fontSize: titleSize, lineHeight: titleSize * 1.3 }}
        >
          {title}
        </Text>
        {right}
      </View>
      {subtitle ? (
        <Text
          className="mt-1 font-body text-[13px] text-ink-55"
          style={{ marginLeft: back ? 48 : 0 }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
