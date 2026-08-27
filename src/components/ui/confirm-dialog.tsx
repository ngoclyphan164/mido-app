import { Modal, Pressable, Text, View } from 'react-native';

import { OutlineButton } from '@/components/ui/buttons';
import { cn } from '@/lib/cn';
import { SHADOWS } from '@/theme/tokens';

/**
 * Confirmation sheet for destructive actions. `Alert.alert` is a no-op on
 * react-native-web, and deleting a nhóm or a kèo is exactly the kind of thing
 * that must not silently go through there, so this is a plain Modal instead.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Huỷ',
  destructive = false,
  pending = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
      <View
        className="flex-1 items-center justify-center px-8"
        style={{ backgroundColor: 'rgba(43,20,32,0.35)' }}
      >
        <View className="w-full gap-4 rounded-sheet bg-card p-5" style={SHADOWS.card}>
          <View className="gap-2">
            <Text className="font-heading text-[17px] text-ink">{title}</Text>
            {message ? (
              <Text className="font-body text-[13.5px] leading-[20px] text-ink-60">{message}</Text>
            ) : null}
          </View>

          <View className="flex-row gap-2.5">
            <OutlineButton
              className="flex-1"
              disabled={pending}
              label={cancelLabel}
              onPress={onCancel}
              tone="neutral"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: pending }}
              className={cn(
                'flex-1 items-center justify-center rounded-full py-[13px]',
                destructive ? 'bg-danger' : 'bg-coral',
                pending ? 'opacity-50' : 'active:opacity-80',
              )}
              disabled={pending}
              onPress={onConfirm}
            >
              <Text className="font-heading text-[14.5px] text-card">{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
