import { SavedLocationForm } from '@/components/saved-location-form';
import { Screen, ScreenHeader } from '@/components/ui/screen';

export default function NewSavedLocation() {
  return (
    <Screen>
      <ScreenHeader subtitle="Đặt tên cho một chỗ bạn hay xuất phát" title="Thêm địa điểm" />
      <SavedLocationForm />
    </Screen>
  );
}
