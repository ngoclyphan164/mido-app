import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { BudgetSlider } from '@/components/ui/budget-slider';
import { DangerButton, PrimaryButton } from '@/components/ui/buttons';
import { CategoryPicker } from '@/components/ui/category-picker';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ChoiceChips } from '@/components/ui/controls';
import { DateTimeField } from '@/components/ui/date-time-field';
import { Checkbox } from '@/components/ui/form';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { Card, SectionTitle } from '@/components/ui/typography';
import { activityLabel, hangoutStatusLabel } from '@/lib/api/present';
import { useDeleteHangout, useHangout, useMe, useUpdateHangout } from '@/lib/api/queries';
import type { ActivityType, HangoutDetail, UpdateHangoutRequest } from '@/lib/api/types';
import { BUDGET, CATEGORIES, FAIRNESS_MODES, TRAVEL_LIMITS, formatDong } from '@/lib/ui-config';
import { SHADOWS } from '@/theme/tokens';

/** The kèo may carry a cap the design's four presets don't list — pick the nearest. */
function nearestTravelLimitIndex(timeCapSeconds: number) {
  let best = 0;
  TRAVEL_LIMITS.forEach((limit, index) => {
    const closer =
      Math.abs(limit.seconds - timeCapSeconds) <
      Math.abs(TRAVEL_LIMITS[best].seconds - timeCapSeconds);
    if (closer) best = index;
  });
  return best;
}

function clampBudget(value: number) {
  return Math.min(BUDGET.max, Math.max(BUDGET.min, value));
}

export default function EditHangout() {
  const { hangoutId } = useLocalSearchParams<{ hangoutId: string }>();
  const hangout = useHangout(hangoutId);
  const me = useMe();

  if (hangout.isPending) {
    return (
      <Screen>
        <ScreenHeader title="Sửa kèo" />
        <LoadingState label="Đang tải kèo…" />
      </Screen>
    );
  }

  if (hangout.isError || !hangout.data) {
    return (
      <Screen>
        <ScreenHeader title="Sửa kèo" />
        <ErrorState error={hangout.error} onRetry={hangout.refetch} />
      </Screen>
    );
  }

  // Keyed on the kèo so the form state is seeded from server data once, rather
  // than being resynced by an effect on every refetch.
  return (
    <EditHangoutForm hangout={hangout.data} key={hangout.data.id} myUserId={me.data?.user.id} />
  );
}

function EditHangoutForm({
  hangout,
  myUserId,
}: {
  hangout: HangoutDetail;
  myUserId: string | undefined;
}) {
  const router = useRouter();

  const [categoryIndex, setCategoryIndex] = useState(() =>
    CATEGORIES.findIndex((category) => category.key === hangout.activityType),
  );
  const [plannedAt, setPlannedAt] = useState(() => new Date(hangout.plannedAt));
  const [noBudget, setNoBudget] = useState(hangout.budgetMax === null);
  const [budget, setBudget] = useState(() => clampBudget(hangout.budgetMax ?? BUDGET.default));
  const [travelLimitIndex, setTravelLimitIndex] = useState(() =>
    nearestTravelLimitIndex(hangout.timeCapSeconds),
  );
  const [fairnessIndex, setFairnessIndex] = useState(() =>
    Math.max(
      0,
      FAIRNESS_MODES.findIndex((mode) => mode.value === hangout.fairnessMode),
    ),
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const updateHangout = useUpdateHangout(hangout.id, hangout.groupId);
  const deleteHangout = useDeleteHangout(hangout.id, hangout.groupId);

  // Same rule as the API: creator or group owner/admin, and only before the kèo
  // has been decided. Deleting stays allowed on a cancelled kèo, editing not.
  const canManage =
    hangout.createdBy === myUserId || hangout.role === 'owner' || hangout.role === 'admin';
  const canEdit = canManage && (hangout.status === 'draft' || hangout.status === 'voting');
  const canDelete = canManage && hangout.status !== 'decided' && hangout.status !== 'done';

  /** Only changed fields go over the wire — the API rejects an empty patch. */
  function buildPatch(): UpdateHangoutRequest {
    const patch: UpdateHangoutRequest = {};

    const activityType = CATEGORIES[categoryIndex]?.key as ActivityType | undefined;
    if (activityType && activityType !== hangout.activityType) patch.activityType = activityType;

    const nextPlannedAt = plannedAt.toISOString();
    if (nextPlannedAt !== new Date(hangout.plannedAt).toISOString())
      patch.plannedAt = nextPlannedAt;

    const nextBudget = noBudget ? null : budget;
    if (nextBudget !== hangout.budgetMax) patch.budgetMax = nextBudget;

    const nextCap = TRAVEL_LIMITS[travelLimitIndex].seconds;
    if (nextCap !== hangout.timeCapSeconds) patch.timeCapSeconds = nextCap;

    const nextFairness = FAIRNESS_MODES[fairnessIndex].value;
    if (nextFairness !== hangout.fairnessMode) patch.fairnessMode = nextFairness;

    return patch;
  }

  const patch = buildPatch();
  const dirty = Object.keys(patch).length > 0;
  const busy = updateHangout.isPending || deleteHangout.isPending;

  function save() {
    updateHangout.mutate(patch, { onSuccess: () => router.back() });
  }

  function remove() {
    deleteHangout.mutate(undefined, {
      onSuccess: () => {
        setConfirmingDelete(false);
        // Every screen for this kèo is now dead, so unwind to its group.
        if (router.canDismiss()) router.dismissAll();
        router.replace(`/group/${hangout.groupId}`);
      },
    });
  }

  return (
    <Screen>
      <ScreenHeader
        subtitle={`${hangout.groupName} · ${hangoutStatusLabel(hangout.status)}`}
        title="Sửa kèo"
      />

      <ScrollView className="flex-1" contentContainerClassName="pb-6">
        {!canEdit ? (
          <View className="px-5 pt-5">
            <Card className="p-4" style={SHADOWS.card}>
              <Text className="font-body text-[13px] leading-[20px] text-ink-60">
                {!canManage
                  ? 'Chỉ người tạo kèo hoặc chủ nhóm/quản trị viên mới sửa được kèo này.'
                  : `Kèo đang ở trạng thái ${hangoutStatusLabel(hangout.status)} nên không sửa được nữa.`}
              </Text>
            </Card>
          </View>
        ) : null}

        <View
          className={canEdit ? 'pt-[22px]' : 'pt-[22px] opacity-50'}
          style={{ pointerEvents: canEdit ? 'auto' : 'none' }}
        >
          <SectionTitle className="px-5 pb-2.5">Đi đâu?</SectionTitle>
          <CategoryPicker onChange={setCategoryIndex} value={categoryIndex} />
          {categoryIndex < 0 ? (
            <Text className="px-5 pt-2 font-body text-[12px] text-ink-45">
              Hoạt động hiện tại: {activityLabel(hangout.activityType)}. Chọn một mục ở trên để đổi.
            </Text>
          ) : null}

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
              <Checkbox checked={noBudget} onToggle={() => setNoBudget((value) => !value)}>
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

          <View className="gap-2.5 px-5 pt-6">
            <SectionTitle>Ưu tiên khi gợi ý</SectionTitle>
            <ChoiceChips
              onChange={setFairnessIndex}
              options={FAIRNESS_MODES.map((mode) => mode.label)}
              size="sm"
              value={fairnessIndex}
            />
          </View>
        </View>

        {updateHangout.error ? <ErrorState error={updateHangout.error} /> : null}

        {canDelete ? (
          <View className="gap-2.5 px-5 pt-9">
            <SectionTitle>Xoá kèo</SectionTitle>
            <Text className="font-body text-[13px] leading-[20px] text-ink-55">
              Xoá kèo sẽ gỡ luôn vị trí, gợi ý và bình chọn của kèo này. Không thể hoàn tác.
            </Text>
            <DangerButton
              disabled={busy}
              label={deleteHangout.isPending ? 'Đang xoá…' : 'Xoá kèo'}
              onPress={() => setConfirmingDelete(true)}
            />
            {deleteHangout.error ? <ErrorState error={deleteHangout.error} /> : null}
          </View>
        ) : null}
      </ScrollView>

      {canEdit ? (
        <View className="px-5 pb-8 pt-5">
          <PrimaryButton
            disabled={!dirty || busy}
            label={updateHangout.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
            onPress={save}
          />
        </View>
      ) : null}

      <ConfirmDialog
        confirmLabel="Xoá kèo"
        destructive
        message={`Kèo ${activityLabel(hangout.activityType)} cùng vị trí, gợi ý và bình chọn sẽ bị xoá vĩnh viễn.`}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={remove}
        pending={deleteHangout.isPending}
        title="Xoá kèo này?"
        visible={confirmingDelete}
      />
    </Screen>
  );
}
