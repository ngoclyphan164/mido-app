import { Text, View } from 'react-native';

import { cn } from '@/lib/cn';
import { avatarColors } from '@/theme/tokens';

const FONT_RATIO = 0.39;

/**
 * Member avatar: a hue-shifted disc with the member's initial. Hues stay at a
 * fixed lightness/chroma so every avatar reads at the same weight.
 */
export function Avatar({
  initial,
  hueIndex,
  size = 36,
  ring = false,
  className,
}: {
  initial: string;
  hueIndex: number;
  size?: number;
  /** White 2px ring, for the overlapping stack in the vote footer. */
  ring?: boolean;
  className?: string;
}) {
  const { bg, fg } = avatarColors(hueIndex);

  return (
    <View
      className={cn('items-center justify-center rounded-full', className)}
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        ...(ring ? { borderWidth: 2, borderColor: '#FFFFFF' } : null),
      }}
    >
      <Text
        className="font-heading"
        style={{ color: fg, fontSize: Math.round(size * FONT_RATIO * 10) / 10 }}
      >
        {initial}
      </Text>
    </View>
  );
}

/** Dashed "invite one more" slot next to the avatar row. */
export function AddAvatar({ size = 40 }: { size?: number }) {
  return (
    <View
      className="items-center justify-center rounded-full border-2 border-dashed border-ink-25"
      style={{ width: size, height: size }}
    >
      <Text className="font-body text-[18px] leading-[20px] text-ink-40">+</Text>
    </View>
  );
}

/** Overlapping avatar stack — each disc after the first pulls 8px left. */
export function AvatarStack({
  members,
  size = 26,
}: {
  members: { initial: string; hueIndex: number }[];
  size?: number;
}) {
  return (
    <View className="flex-row">
      {members.map((member, index) => (
        <Avatar
          className={index > 0 ? '-ml-2' : undefined}
          hueIndex={member.hueIndex}
          initial=""
          key={`${member.initial}-${index}`}
          ring
          size={size}
        />
      ))}
    </View>
  );
}
