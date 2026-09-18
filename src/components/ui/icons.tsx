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
/**
 * Logo "G" bốn màu của Google, đúng bảng màu thương hiệu.
 *
 * Nguyên tắc nhận diện của Google cấm tô lại logo theo màu app, nên bốn mã màu
 * dưới đây là cố định và không lấy từ `tokens.ts`.
 */
export function GoogleIcon({ size = 18 }: Pick<IconProps, 'size'>) {
  return (
    <Svg height={size} viewBox="0 0 48 48" width={size}>
      <Path
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
        fill="#4285F4"
      />
      <Path
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
        fill="#34A853"
      />
      <Path
        d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"
        fill="#FBBC05"
      />
      <Path
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
        fill="#EA4335"
      />
    </Svg>
  );
}

/** Quả táo đặc, dùng trên nút "Tiếp tục với Apple". */
export function AppleIcon({ color = '#2B1420', size = 18 }: IconProps) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M16.37 12.78c.02 2.56 2.24 3.41 2.27 3.42-.02.06-.36 1.23-1.18 2.44-.71 1.04-1.45 2.08-2.62 2.1-1.15.02-1.52-.68-2.83-.68s-1.72.66-2.81.7c-1.13.04-1.99-1.13-2.7-2.17-1.46-2.12-2.57-5.99-1.08-8.6.74-1.3 2.07-2.12 3.51-2.14 1.11-.02 2.15.75 2.83.75.68 0 1.95-.93 3.28-.79.56.02 2.13.23 3.14 1.7-.08.05-1.87 1.1-1.85 3.27M14.22 4.6c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.55 1.31-.56.64-1.05 1.68-.92 2.67.97.08 1.96-.49 2.57-1.22"
        fill={color}
      />
    </Svg>
  );
}

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
