import { useLocalSearchParams } from 'expo-router';

import { SavedLocationForm } from '@/components/saved-location-form';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useSavedLocations } from '@/lib/api/queries';

export default function EditSavedLocation() {
  const { locationId } = useLocalSearchParams<{ locationId: string }>();

  // API không có route đọc một địa điểm: danh sách đã nằm sẵn trong cache và
  // thường không quá 20 dòng, nên thêm một endpoint chỉ để lấy một hàng là thừa.
  const savedLocations = useSavedLocations();
  const location = savedLocations.data?.find((item) => item.id === locationId);

  return (
    <Screen>
      <ScreenHeader subtitle={location?.label} title="Sửa địa điểm" />

      {savedLocations.isPending ? (
        <LoadingState />
      ) : savedLocations.isError ? (
        <ErrorState error={savedLocations.error} onRetry={savedLocations.refetch} />
      ) : !location ? (
        <EmptyState hint="Có thể nó vừa bị xoá." title="Không tìm thấy địa điểm" />
      ) : (
        // `key` ép form khởi tạo lại nếu id đổi mà màn không bị gỡ.
        <SavedLocationForm key={location.id} location={location} />
      )}
    </Screen>
  );
}
