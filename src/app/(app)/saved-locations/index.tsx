import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/buttons';
import { ChevronRight } from '@/components/ui/icons';
import { ListGroup } from '@/components/ui/list-group';
import { MapPin } from '@/components/ui/placeholders';
import { useRefreshControl } from '@/components/ui/refresh';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useSavedLocations } from '@/lib/api/queries';

export default function SavedLocations() {
  const router = useRouter();
  const savedLocations = useSavedLocations();

  const refreshControl = useRefreshControl([savedLocations]);
  const locations = savedLocations.data ?? [];

  return (
    <Screen>
      <ScreenHeader subtitle="Chọn điểm xuất phát bằng một chạm" title="Địa điểm đã lưu" />

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-6"
        refreshControl={refreshControl}
      >
        {savedLocations.isPending ? (
          <LoadingState />
        ) : savedLocations.isError ? (
          <ErrorState error={savedLocations.error} onRetry={savedLocations.refetch} />
        ) : locations.length === 0 ? (
          <EmptyState
            hint="Lưu nhà hoặc công ty một lần, rồi mọi kèo sau chỉ cần một chạm."
            title="Chưa lưu địa điểm nào"
          />
        ) : (
          <View className="px-5 pt-5">
            <ListGroup
              items={locations.map((location) => ({
                key: location.id,
                onPress: () => router.push(`/saved-locations/${location.id}`),
                children: (
                  <>
                    <View className="h-8 w-8 items-center justify-center">
                      <MapPin size={16} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-body-bold text-[14.5px] text-ink">
                        {location.label}
                      </Text>
                      {location.address ? (
                        <Text className="font-body text-[12px] text-ink-45" numberOfLines={1}>
                          {location.address}
                        </Text>
                      ) : null}
                    </View>
                    <ChevronRight size={12} />
                  </>
                ),
              }))}
            />
          </View>
        )}
      </ScrollView>

      <View className="px-5 pb-6 pt-2">
        <PrimaryButton label="Thêm địa điểm" onPress={() => router.push('/saved-locations/new')} />
      </View>
    </Screen>
  );
}
