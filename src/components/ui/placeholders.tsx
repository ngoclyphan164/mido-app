import { StyleSheet, View } from 'react-native';

import { HatchFill } from '@/components/ui/icons';
import { MonoText } from '@/components/ui/typography';
import { cn } from '@/lib/cn';
import { SHADOWS } from '@/theme/tokens';

/**
 * Teardrop map pin: a square with three rounded corners, rotated so the sharp
 * corner points down. The design rotates the square corner by +45°, which
 * lands it on the left edge — negated here so the pin points at its location.
 */
export function MapPin({ size = 22, color = '#F0564F' }: { size?: number; color?: string }) {
  const r = size / 2;
  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        borderTopLeftRadius: r,
        borderTopRightRadius: r,
        borderBottomRightRadius: r,
        borderBottomLeftRadius: 0,
        transform: [{ rotate: '-45deg' }],
        ...SHADOWS.pin,
      }}
    />
  );
}

/** Hatched stand-in for map tiles and venue photography. */
export function Placeholder({
  label,
  height,
  radius = 16,
  stripe = 8,
  pin = false,
  className,
}: {
  label?: string;
  height?: number;
  radius?: number;
  stripe?: number;
  pin?: boolean;
  className?: string;
}) {
  return (
    <View className={cn('overflow-hidden', className)} style={{ height, borderRadius: radius }}>
      <View style={StyleSheet.absoluteFill}>
        <HatchFill stripe={stripe} />
      </View>
      {label ? (
        // Shifted below centre when a pin is present so the two don't collide.
        <View
          className="absolute left-0 right-0 items-center"
          style={{ top: pin ? '64%' : '50%', marginTop: -7 }}
        >
          <MonoText className="text-[11px] text-ink-40">{label}</MonoText>
        </View>
      ) : null}
      {pin ? (
        <View className="absolute left-0 right-0 items-center" style={{ top: '32%' }}>
          <MapPin />
        </View>
      ) : null}
    </View>
  );
}
