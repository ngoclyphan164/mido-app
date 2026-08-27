import { ActivityIndicator, Text, View } from 'react-native';

import { OutlineButton } from '@/components/ui/buttons';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/cn';

export function LoadingState({ label, className }: { label?: string; className?: string }) {
  return (
    <View className={cn('items-center justify-center gap-3 py-10', className)}>
      <ActivityIndicator color="#F0564F" />
      {label ? <Text className="font-body text-[13px] text-ink-55">{label}</Text> : null}
    </View>
  );
}

/** Surfaces the API's error envelope message rather than a generic string. */
export function ErrorState({
  error,
  onRetry,
  className,
  title = 'Không tải được',
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
  title?: string;
}) {
  const message =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : 'Có lỗi xảy ra';

  return (
    <View className={cn('items-center justify-center gap-3 px-6 py-10', className)}>
      <Text className="text-center font-heading text-[15px] text-ink">{title}</Text>
      <Text className="text-center font-body text-[13px] leading-[20px] text-ink-60">
        {message}
      </Text>
      {onRetry ? <OutlineButton className="px-8" label="Thử lại" onPress={onRetry} /> : null}
    </View>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <View className="items-center justify-center gap-2 px-6 py-10">
      <Text className="text-center font-heading text-[15px] text-ink">{title}</Text>
      {hint ? (
        <Text className="text-center font-body text-[13px] leading-[20px] text-ink-55">{hint}</Text>
      ) : null}
    </View>
  );
}
