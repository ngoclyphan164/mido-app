import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { DangerButton, PrimaryButton } from '@/components/ui/buttons';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LabeledInput } from '@/components/ui/form';
import { LocationSearchField } from '@/components/ui/location-search-field';
import { MapPreview } from '@/components/ui/map-preview';
import { ErrorState } from '@/components/ui/states';
import { FieldLabel } from '@/components/ui/typography';
import {
  useCreateSavedLocation,
  useDeleteSavedLocation,
  useUpdateSavedLocation,
} from '@/lib/api/queries';
import type { Coordinate, SavedLocation } from '@/lib/api/types';

/** Trung tâm TP.HCM — chỉ là khung nhìn ban đầu của bản đồ, không phải giá trị đã chọn. */
const DEFAULT_COORD: Coordinate = { lat: 10.7769, lng: 106.7009 };

type Draft = {
  label: string;
  coord: Coordinate | null;
  address: string | null;
};

/**
 * Dùng chung cho màn thêm mới và màn sửa. Tách khỏi route theo đúng cách
 * `group/[groupId]/edit.tsx` tách loader khỏi form, để form luôn khởi tạo từ một
 * thực thể đã tải xong.
 */
export function SavedLocationForm({ location }: { location?: SavedLocation }) {
  const router = useRouter();

  const createLocation = useCreateSavedLocation();
  const updateLocation = useUpdateSavedLocation(location?.id);
  const deleteLocation = useDeleteSavedLocation();

  const [draft, setDraft] = useState<Draft>({
    label: location?.label ?? '',
    coord: location?.location ?? null,
    address: location?.address ?? null,
  });
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function useCurrentLocation(): Promise<boolean> {
    setIsLocating(true);
    setLocationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        setLocationError('Không có quyền truy cập vị trí.');
        return false;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setDraft((current) => ({
        ...current,
        coord: { lat: position.coords.latitude, lng: position.coords.longitude },
        // Toạ độ mới thì địa chỉ cũ không còn đúng nữa.
        address: null,
      }));
      return true;
    } catch {
      setLocationError('Chưa lấy được vị trí hiện tại.');
      return false;
    } finally {
      setIsLocating(false);
    }
  }

  function submit() {
    const label = draft.label.trim();
    if (!label || !draft.coord) return;

    const body = {
      label,
      lat: draft.coord.lat,
      lng: draft.coord.lng,
      ...(draft.address ? { address: draft.address } : null),
    };

    if (location) {
      updateLocation.mutate(
        { ...body, address: draft.address },
        { onSuccess: () => router.back() },
      );
    } else {
      createLocation.mutate(body, { onSuccess: () => router.back() });
    }
  }

  const pending = createLocation.isPending || updateLocation.isPending;
  const error = createLocation.error ?? updateLocation.error ?? deleteLocation.error;
  const canSubmit = Boolean(draft.label.trim()) && Boolean(draft.coord) && !pending;

  return (
    <>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-4"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-3.5 px-5 pt-5">
          <LabeledInput
            label="Tên gọi"
            maxLength={80}
            onChangeText={(label) => setDraft((current) => ({ ...current, label }))}
            placeholder="Nhà, Công ty, Trường…"
            value={draft.label}
          />

          <View className="gap-2">
            <FieldLabel>Vị trí</FieldLabel>
            <LocationSearchField
              center={draft.coord ?? DEFAULT_COORD}
              currentLocationError={locationError}
              isLocating={isLocating}
              onSelect={(place) =>
                setDraft((current) => ({
                  ...current,
                  coord: place.location,
                  address: place.address ?? place.name,
                  // Tên gọi để trống thì mượn tên địa điểm làm gợi ý đầu tiên.
                  label: current.label || place.name,
                }))
              }
              onUseCurrentLocation={useCurrentLocation}
              selectedLabel={draft.address ?? undefined}
            />
          </View>

          <MapPreview
            coord={draft.coord ?? DEFAULT_COORD}
            height={160}
            interactive
            onPickCoord={(coord) => setDraft((current) => ({ ...current, coord, address: null }))}
          />

          <Text className="font-body text-[12px] leading-[18px] text-ink-45">
            {draft.address
              ? draft.address
              : 'Chạm lên bản đồ để chỉnh lại điểm cho chính xác. Địa chỉ giúp Mido điền sẵn điểm xuất phát khi bạn chọn địa điểm này.'}
          </Text>
        </View>

        {error ? <ErrorState error={error} title="Chưa lưu được địa điểm" /> : null}
      </ScrollView>

      <View className="gap-2.5 px-5 pb-8 pt-5">
        <PrimaryButton
          disabled={!canSubmit}
          label={pending ? 'Đang lưu…' : location ? 'Lưu thay đổi' : 'Lưu địa điểm'}
          onPress={submit}
        />
        {location ? (
          <DangerButton
            disabled={deleteLocation.isPending}
            label={deleteLocation.isPending ? 'Đang xoá…' : 'Xoá địa điểm'}
            onPress={() => setConfirmingDelete(true)}
          />
        ) : null}
      </View>

      <ConfirmDialog
        confirmLabel="Xoá"
        destructive
        message={`"${location?.label ?? ''}" sẽ không còn hiện khi bạn chọn điểm xuất phát.`}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() =>
          location &&
          deleteLocation.mutate(location.id, {
            onSuccess: () => {
              setConfirmingDelete(false);
              router.back();
            },
          })
        }
        pending={deleteLocation.isPending}
        title="Xoá địa điểm này?"
        visible={confirmingDelete}
      />
    </>
  );
}
