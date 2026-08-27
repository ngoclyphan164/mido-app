import {
  BottomSheet,
  BottomSheetView,
  type BottomSheetMethods,
} from '@expo/ui/community/bottom-sheet';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/buttons';
import { Card } from '@/components/ui/typography';
import { formatDayDate, formatTime } from '@/lib/api/present';
import { SHADOWS } from '@/theme/tokens';

type Mode = 'date' | 'time';

/**
 * Date and time fields backed by one native modal bottom sheet. Changes stay in
 * a draft until the member taps “Xong”; dismissing the sheet leaves the form
 * value untouched.
 */
export function DateTimeField({
  value,
  onChange,
  minimumDate,
}: {
  value: Date;
  onChange: (next: Date) => void;
  minimumDate?: Date;
}) {
  const sheetRef = useRef<BottomSheetMethods>(null);
  const [open, setOpen] = useState<Mode | null>(null);
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    if (open) sheetRef.current?.present();
  }, [open]);

  function showPicker(mode: Mode) {
    setDraftValue(value);
    setOpen(mode);
  }

  function closePicker() {
    sheetRef.current?.close();
  }

  function confirmPicker() {
    onChange(draftValue);
    closePicker();
  }

  const activeMode = open ?? 'date';

  return (
    <View className="gap-2.5">
      <View className="flex-row gap-2.5">
        <Pressable
          accessibilityLabel="Chọn ngày"
          accessibilityRole="button"
          accessibilityState={{ expanded: open === 'date' }}
          className="flex-1 active:opacity-70"
          onPress={() => showPicker('date')}
        >
          <Card className="rounded-[14px] px-3.5 py-3" style={SHADOWS.field}>
            <Text className="font-body text-[14.5px] text-ink">
              {formatDayDate(value.toISOString())}
            </Text>
          </Card>
        </Pressable>
        <Pressable
          accessibilityLabel="Chọn giờ"
          accessibilityRole="button"
          accessibilityState={{ expanded: open === 'time' }}
          className="w-24 active:opacity-70"
          onPress={() => showPicker('time')}
        >
          <Card className="items-center rounded-[14px] px-3.5 py-3" style={SHADOWS.field}>
            <Text className="font-body text-[14.5px] text-ink">
              {formatTime(value.toISOString())}
            </Text>
          </Card>
        </Pressable>
      </View>

      <BottomSheet
        backgroundStyle={{ backgroundColor: '#FFF8F4' }}
        enablePanDownToClose
        index={-1}
        onClose={() => setOpen(null)}
        ref={sheetRef}
      >
        <BottomSheetView style={{ paddingHorizontal: 20, paddingBottom: 28 }}>
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="font-heading text-[18px] text-ink">
              {activeMode === 'date' ? 'Chọn ngày' : 'Chọn giờ'}
            </Text>
            <Pressable
              accessibilityRole="button"
              className="px-2 py-2 active:opacity-60"
              onPress={closePicker}
            >
              <Text className="font-body-bold text-[13.5px] text-ink-50">Hủy</Text>
            </Pressable>
          </View>

          <DateTimePicker
            accentColor="#F0564F"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            is24Hour
            locale="vi-VN"
            minimumDate={minimumDate}
            mode={activeMode}
            onValueChange={(_event, next) => setDraftValue(next)}
            presentation="inline"
            style={{ width: '100%', ...(Platform.OS === 'ios' ? { height: 216 } : null) }}
            // The app has no dark theme, so the sheet is always cream. Without
            // this the wheel follows the system scheme and paints white text on
            // the cream background.
            themeVariant="light"
            value={draftValue}
          />

          <PrimaryButton className="mt-3" label="Xong" onPress={confirmPicker} />
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}
