import {
  BottomSheet,
  BottomSheetView,
  type BottomSheetMethods,
} from '@expo/ui/community/bottom-sheet';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/buttons';
import { LabeledInput } from '@/components/ui/form';
import { Card } from '@/components/ui/typography';
import { formatDayDate, formatTime } from '@/lib/api/present';
import { SHADOWS } from '@/theme/tokens';

type Mode = 'date' | 'time';

const pad = (value: number) => String(value).padStart(2, '0');
const toDateInput = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const toTimeInput = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** Web keeps typed inputs, but presents them in the same bottom-sheet flow. */
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
  const [dateText, setDateText] = useState(() => toDateInput(value));
  const [timeText, setTimeText] = useState(() => toTimeInput(value));

  useEffect(() => {
    if (open) sheetRef.current?.present();
  }, [open]);

  function showPicker(mode: Mode) {
    setDateText(toDateInput(value));
    setTimeText(toTimeInput(value));
    setOpen(mode);
  }

  function closePicker() {
    sheetRef.current?.close();
  }

  function confirmPicker() {
    const [year, month, day] = dateText.split('-').map(Number);
    const [hour, minute] = timeText.split(':').map(Number);
    if ([year, month, day, hour, minute].some((part) => !Number.isFinite(part))) return;

    const next = new Date(year, month - 1, day, hour, minute, 0, 0);
    if (Number.isNaN(next.getTime()) || (minimumDate && next < minimumDate)) return;

    onChange(next);
    closePicker();
  }

  const activeMode = open ?? 'date';

  return (
    <View className="gap-2.5">
      <View className="flex-row gap-2.5">
        <Pressable
          accessibilityLabel="Chọn ngày"
          accessibilityRole="button"
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
        <BottomSheetView style={{ gap: 16, paddingHorizontal: 20, paddingBottom: 28 }}>
          <View className="flex-row items-center justify-between">
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

          {activeMode === 'date' ? (
            <LabeledInput
              autoFocus
              label="Ngày (YYYY-MM-DD)"
              onChangeText={setDateText}
              placeholder="2026-08-29"
              value={dateText}
            />
          ) : (
            <LabeledInput
              autoFocus
              label="Giờ (HH:mm)"
              onChangeText={setTimeText}
              placeholder="19:00"
              value={timeText}
            />
          )}

          <PrimaryButton label="Xong" onPress={confirmPicker} />
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}
