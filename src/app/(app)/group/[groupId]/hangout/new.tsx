import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { BudgetSlider } from '@/components/ui/budget-slider';
import { PrimaryButton } from '@/components/ui/buttons';
import { CategoryPicker } from '@/components/ui/category-picker';
import { ChoiceChips } from '@/components/ui/controls';
import { DateTimeField } from '@/components/ui/date-time-field';
import { Checkbox } from '@/components/ui/form';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { ErrorState } from '@/components/ui/states';
import { SectionTitle } from '@/components/ui/typography';
import { useCreateHangout } from '@/lib/api/queries';
import type { ActivityType } from '@/lib/api/types';
import { CATEGORIES, BUDGET, TRAVEL_LIMITS, formatDong } from '@/lib/ui-config';
import { uuidv4 } from '@/lib/uuid';
import { useHangoutStore } from '@/store/use-hangout-store';

/** Next Saturday at 19:00 local time, matching the design's example slot. */
function nextSaturdayEvening() {
  const date = new Date();
  const daysAhead = (6 - date.getDay() + 7) % 7 || 7;
  date.setDate(date.getDate() + daysAhead);
  date.setHours(19, 0, 0, 0);
  return date;
}

export default function NewHangout() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const {
    categoryIndex,
    setCategoryIndex,
    budget,
    setBudget,
    travelLimitIndex,
    setTravelLimitIndex,
  } = useHangoutStore();

  const [plannedAt, setPlannedAt] = useState(nextSaturdayEvening);
  const [noBudget, setNoBudget] = useState(false);
  // One key per screen visit keeps a retried tap idempotent server-side.
  const [idempotencyKey] = useState(uuidv4);

  const createHangout = useCreateHangout(groupId);

  function submit() {
    createHangout.mutate(
      {
        activityType: CATEGORIES[categoryIndex].key as ActivityType,
        plannedAt: plannedAt.toISOString(),
        // Bỏ hẳn field thay vì gửi 0: API coi vắng mặt là không giới hạn, còn 0
        // là "mỗi người tiêu 0 đồng".
        ...(noBudget ? null : { budgetMax: budget }),
        timeCapSeconds: TRAVEL_LIMITS[travelLimitIndex].seconds,
        idempotencyKey,
      },
      { onSuccess: (hangout) => router.push(`/hangout/${hangout.id}/locations`) },
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Kèo mới" />

      <ScrollView className="flex-1" contentContainerClassName="pb-4">
        <View className="pt-[22px]">
          <SectionTitle className="px-5 pb-2.5">Đi đâu?</SectionTitle>
          <CategoryPicker onChange={setCategoryIndex} value={categoryIndex} />
        </View>

        <View className="gap-2.5 px-5 pt-6">
          <SectionTitle>Khi nào?</SectionTitle>
          <DateTimeField minimumDate={new Date()} onChange={setPlannedAt} value={plannedAt} />
        </View>

        <View className="px-5 pt-6">
          <View className="flex-row items-baseline justify-between">
            <SectionTitle>Ngân sách mỗi người</SectionTitle>
            <Text className="font-heading text-[14.5px] text-coral">
              {noBudget ? 'Không giới hạn' : formatDong(budget)}
            </Text>
          </View>
          {noBudget ? null : (
            <BudgetSlider
              max={BUDGET.max}
              min={BUDGET.min}
              onChange={setBudget}
              step={BUDGET.step}
              value={budget}
            />
          )}
          <View className="pt-3">
            <Checkbox checked={noBudget} onToggle={() => setNoBudget((current) => !current)}>
              Không đặt giới hạn ngân sách
            </Checkbox>
          </View>
        </View>

        <View className="gap-2.5 px-5 pt-6">
          <SectionTitle>Sẵn sàng đi bao xa?</SectionTitle>
          <ChoiceChips
            onChange={setTravelLimitIndex}
            options={TRAVEL_LIMITS.map((limit) => limit.label)}
            value={travelLimitIndex}
          />
        </View>

        {createHangout.error ? <ErrorState error={createHangout.error} /> : null}
      </ScrollView>

      <View className="px-5 pb-8 pt-5">
        <PrimaryButton
          disabled={createHangout.isPending}
          label={createHangout.isPending ? 'Đang tạo kèo…' : 'Tiếp tục · Thêm vị trí mọi người'}
          onPress={submit}
        />
      </View>
    </Screen>
  );
}
