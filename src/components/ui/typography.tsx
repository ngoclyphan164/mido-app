import { Platform, Text, View } from 'react-native';

import { cn } from '@/lib/cn';

/**
 * `ui-monospace` isn't a resolvable family on native, so pick the real one per
 * platform. Used for the invite link and the map/photo placeholder captions.
 */
const MONO_FAMILY = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'ui-monospace, SFMono-Regular, Menlo, monospace',
});

export function MonoText({
  children,
  className,
  style,
}: {
  children: string;
  className?: string;
  style?: React.ComponentProps<typeof Text>['style'];
}) {
  return (
    <Text className={className} style={[{ fontFamily: MONO_FAMILY }, style]}>
      {children}
    </Text>
  );
}

/** Small uppercase field label — "TÊN NHÓM", "MỜI BẠN BÈ". */
export function FieldLabel({ children, className }: { children: string; className?: string }) {
  return (
    <Text
      className={cn('font-body-bold text-[12px] uppercase text-ink-50', className)}
      style={{ letterSpacing: 0.48 }}
    >
      {children}
    </Text>
  );
}

/** Baloo section heading inside a screen — "Đi đâu?", "Khi nào?". */
export function SectionTitle({
  children,
  className,
  size = 14.5,
}: {
  children: string;
  className?: string;
  size?: number;
}) {
  return (
    <Text className={cn('font-heading text-ink', className)} style={{ fontSize: size }}>
      {children}
    </Text>
  );
}

/** White rounded surface used for inputs and read-only value rows. */
export function Card({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.ComponentProps<typeof View>['style'];
}) {
  return (
    <View className={cn('rounded-card bg-card', className)} style={style}>
      {children}
    </View>
  );
}
