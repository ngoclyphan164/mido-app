import { forwardRef, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { Check } from '@/components/ui/icons';
import { FieldLabel } from '@/components/ui/typography';
import { cn } from '@/lib/cn';
import { SHADOWS } from '@/theme/tokens';

/**
 * The field's padding belongs on the TextInput, not the wrapper: that makes the
 * whole 48px box tappable and gives the same height on both platforms. The
 * design specifies 14px/16px padding around 15px text.
 *
 * These are plain styles rather than classNames on purpose. A controlled input
 * re-renders on every keystroke, and keeping class resolution out of that path
 * is what makes typing feel immediate.
 */
const styles = StyleSheet.create({
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    lineHeight: 20,
    color: '#2B1420',
    // Android adds its own font padding, which throws the 48px height off.
    ...Platform.select({ android: { includeFontPadding: false, textAlignVertical: 'center' } }),
  },
  field: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trailing: {
    paddingRight: 16,
    paddingLeft: 4,
  },
});

const PLACEHOLDER = 'rgba(43,20,32,0.4)';

export const LabeledInput = forwardRef<
  TextInput,
  TextInputProps & { label: string; trailing?: ReactNode }
>(function LabeledInput({ label, trailing, style, ...inputProps }, ref) {
  return (
    <View className="gap-2">
      <FieldLabel>{label}</FieldLabel>
      <View style={[styles.field, SHADOWS.field]}>
        <TextInput
          placeholderTextColor={PLACEHOLDER}
          ref={ref}
          style={[styles.input, style]}
          {...inputProps}
        />
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
    </View>
  );
});

/** Square coral checkbox with a white tick. */
export function Checkbox({
  checked,
  onToggle,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  children: string;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      className="flex-row items-start gap-2.5 active:opacity-70"
      onPress={onToggle}
    >
      <View
        className={cn(
          'mt-px h-[18px] w-[18px] items-center justify-center rounded-[5px]',
          checked ? 'bg-coral' : 'border-[1.5px] border-ink-25',
        )}
      >
        {checked ? <Check color="#FFFFFF" size={7} /> : null}
      </View>
      <Text className="flex-1 font-body text-[12.5px] leading-[19px] text-ink-55">{children}</Text>
    </Pressable>
  );
}

/** "Chưa có tài khoản? Đăng ký" footer used by both auth screens. */
export function AuthSwitch({
  prompt,
  actionLabel,
  onPress,
}: {
  prompt: string;
  actionLabel: string;
  onPress: () => void;
}) {
  return (
    <View className="flex-row items-center justify-center">
      <Text className="font-body text-[13.5px] text-ink-55">{prompt} </Text>
      <Pressable accessibilityRole="link" className="active:opacity-60" onPress={onPress}>
        <Text className="font-body-bold text-[13.5px] text-coral">{actionLabel}</Text>
      </Pressable>
    </View>
  );
}
