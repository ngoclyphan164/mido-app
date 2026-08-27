import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View } from 'react-native';

import { cn } from '@/lib/cn';
import { DIAGONAL, GRADIENTS, SHADOWS } from '@/theme/tokens';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  /** Compact inline variant used by the vote footer on the place screen. */
  compact?: boolean;
  className?: string;
};

/**
 * Coral gradient CTA — `linear-gradient(135deg,#FF8A73,#F0564F)`, fully rounded.
 *
 * The gradient stays mounted when disabled and only its colours change. Swapping
 * between a plain View and a LinearGradient remounts the native gradient layer,
 * which is what made the button hitch while typing on the forms.
 */
const DISABLED_COLORS = ['rgba(43,20,32,0.12)', 'rgba(43,20,32,0.12)'] as const;

export function PrimaryButton({ label, onPress, disabled, compact, className }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      className={cn('rounded-full', !disabled && 'active:opacity-85', className)}
      disabled={disabled}
      onPress={onPress}
      style={disabled ? undefined : SHADOWS.cta}
    >
      <LinearGradient
        colors={disabled ? DISABLED_COLORS : GRADIENTS.cta}
        end={DIAGONAL.end}
        start={DIAGONAL.start}
        style={{ borderRadius: 999 }}
      >
        <View
          className={cn('items-center justify-center', compact ? 'px-[18px] py-3' : 'px-4 py-4')}
        >
          <Text
            className={cn(
              'font-heading',
              compact ? 'text-[13px]' : 'text-[15.5px]',
              disabled ? 'text-ink-40' : 'text-card',
            )}
          >
            {label}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

/** Outlined secondary action. `tone` picks between the coral and neutral border. */
export function OutlineButton({
  label,
  onPress,
  disabled,
  tone = 'coral',
  className,
}: Omit<ButtonProps, 'compact'> & { tone?: 'coral' | 'neutral' }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      className={cn(
        'items-center justify-center rounded-full border-[1.5px] py-[13px]',
        disabled ? 'opacity-40' : 'active:opacity-70',
        tone === 'coral' ? 'border-coral' : 'border-ink-15',
        className,
      )}
      disabled={disabled}
      onPress={onPress}
    >
      <Text
        className={cn('font-heading text-[14.5px]', tone === 'coral' ? 'text-coral' : 'text-ink')}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Outlined destructive action — "Xoá nhóm", "Xoá kèo". */
export function DangerButton({
  label,
  onPress,
  disabled,
  className,
}: Omit<ButtonProps, 'compact'>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      className={cn(
        'items-center justify-center rounded-full border-[1.5px] border-danger py-[13px]',
        disabled ? 'opacity-40' : 'active:opacity-70',
        className,
      )}
      disabled={disabled}
      onPress={onPress}
    >
      <Text className="font-heading text-[14.5px] text-danger">{label}</Text>
    </Pressable>
  );
}

/** Plain coral text link, e.g. "Xem thêm lựa chọn". */
export function TextLink({ label, onPress, className }: Omit<ButtonProps, 'compact' | 'disabled'>) {
  return (
    <Pressable
      accessibilityRole="link"
      className={cn('active:opacity-60', className)}
      onPress={onPress}
    >
      <Text className="font-body-bold text-[13.5px] text-coral">{label}</Text>
    </Pressable>
  );
}
