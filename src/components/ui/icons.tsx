import Svg, { Circle, Defs, Line, Path, Pattern, Rect } from 'react-native-svg';
import { useId } from 'react';
import { View } from 'react-native';

import { HATCH } from '@/theme/tokens';

type IconProps = {
  color?: string;
  size?: number;
};

export function ChevronLeft({ color = '#2B1420', size = 16 }: IconProps) {
  return (
    <Svg width={(size * 9) / 16} height={size} viewBox="0 0 9 16">
      <Path
        d="M8 1L1 8l7 7"
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevronRight({ color = 'rgba(43,20,32,0.3)', size = 14 }: IconProps) {
  return (
    <Svg width={(size * 8) / 14} height={size} viewBox="0 0 8 14">
      <Path
        d="M1 1l6 6-6 6"
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function Check({ color = '#0A562B', size = 8 }: IconProps) {
  return (
    <Svg width={(size * 10) / 8} height={size} viewBox="0 0 10 8">
      <Path
        d="M1 4l3 3 5-6"
        stroke={color}
        strokeWidth={1.6}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Three-dot overflow control from the group header. */
export function MoreDots({ color = '#2B1420' }: Pick<IconProps, 'color'>) {
  return (
    <View className="flex-row items-center gap-[2.5px]">
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          className="h-[3.5px] w-[3.5px] rounded-full"
          style={{ backgroundColor: color }}
        />
      ))}
    </View>
  );
}

/** The Mido "M" wordmark: an M stroke with two dots above the outer legs. */
export function MidoMark({ color = '#FFFFFF', size = 38 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M24,80 L24,24 L50,54 L76,24 L76,80"
        fill="none"
        stroke={color}
        strokeWidth={15}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={24} cy={15} r={9.5} fill={color} />
      <Circle cx={76} cy={15} r={9.5} fill={color} />
    </Svg>
  );
}

/**
 * The 45° repeating-linear-gradient the design uses for map and photo
 * placeholders. Rendered as an SVG pattern since React Native has no
 * repeating gradient.
 */
export function HatchFill({ stripe = 6 }: { stripe?: number }) {
  const id = `hatch-${useId()}`;
  const tile = stripe * 2;
  return (
    <Svg width="100%" height="100%">
      <Defs>
        <Pattern
          id={id}
          width={tile}
          height={tile}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <Rect width={tile} height={tile} fill={HATCH.light} />
          <Rect width={stripe} height={tile} fill={HATCH.dark} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/** Dashed spokes behind the welcome-screen constellation. */
export function ConstellationLines({ width = 220, height = 110 }) {
  const stroke = 'rgba(255,255,255,0.55)';
  return (
    <Svg width={width} height={height} viewBox="0 0 220 110">
      {(
        [
          [17, 27],
          [203, 27],
          [23, 95],
          [197, 95],
        ] as const
      ).map(([x, y]) => (
        <Line
          key={`${x}-${y}`}
          x1={x}
          y1={y}
          x2={110}
          y2={55}
          stroke={stroke}
          strokeWidth={2}
          strokeDasharray="3 5"
        />
      ))}
    </Svg>
  );
}

type TabIconProps = { color: string; size?: number };

const TAB_STROKE = 1.9;

export function HomeIcon({ color, size = 22 }: TabIconProps) {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M4 11l8-7 8 7M6 9.5V20h12V9.5"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={TAB_STROKE}
      />
    </Svg>
  );
}

export function GroupsIcon({ color, size = 22 }: TabIconProps) {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Circle cx={8.5} cy={8} r={3} stroke={color} strokeWidth={TAB_STROKE} />
      <Circle cx={17} cy={9.5} r={2.3} stroke={color} strokeWidth={TAB_STROKE} />
      <Path
        d="M2.5 20c0-3.3 2.7-6 6-6s6 2.7 6 6M14.5 20c0-2.4-1-4.5-2.6-5.8 0.9-.6 2-1 3.1-1 2.8 0 5 2.2 5 5v1.8"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={TAB_STROKE}
      />
    </Svg>
  );
}

/** A pair of scales, for the fairness ledger. */
export function FairnessIcon({ color, size = 22 }: TabIconProps) {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M12 3v18M6 7c0 3 2.5 4 2.5 4S6 12 6 15.5M18 7c0 3-2.5 4-2.5 4S18 12 18 15.5"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={TAB_STROKE}
      />
    </Svg>
  );
}

export function ProfileIcon({ color, size = 22 }: TabIconProps) {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Circle cx={12} cy={8} r={3.5} stroke={color} strokeWidth={TAB_STROKE} />
      <Path
        d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={TAB_STROKE}
      />
    </Svg>
  );
}
