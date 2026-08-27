import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { ChevronRight } from '@/components/ui/icons';
import { ListGroup } from '@/components/ui/list-group';
import { useRefreshControl } from '@/components/ui/refresh';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useGroups } from '@/lib/api/queries';

/**
 * The ledger itself is per group, so this tab is the way in rather than a
 * combined view: there is no cross-group fairness figure to show.
 */
export default function Fairness() {
  const router = useRouter();
  const groups = useGroups();

  const refreshControl = useRefreshControl([groups]);

  return (
    <Screen>
      <ScreenHeader back={false} subtitle="Chọn nhóm để xem sổ" title="Sổ công bằng" />

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-6"
        refreshControl={refreshControl}
      >
        {groups.isPending ? (
          <LoadingState />
        ) : groups.isError ? (
          <ErrorState error={groups.error} onRetry={groups.refetch} />
        ) : (groups.data ?? []).length === 0 ? (
          <EmptyState
            hint="Sổ công bằng chỉ có sau khi nhóm đi xong một kèo."
            title="Chưa có nhóm nào"
          />
        ) : (
          <>
            <View className="px-5 pt-4">
              <Text className="font-body text-[12.5px] leading-[19px] text-ink-50">
                Ai đã đi xa hơn được ưu tiên gần hơn ở lần sau.
              </Text>
            </View>
            <View className="px-5 pt-3.5">
              <ListGroup
                items={(groups.data ?? []).map((group) => ({
                  key: group.id,
                  onPress: () => router.push(`/group/${group.id}`),
                  children: (
                    <>
                      <View className="flex-1">
                        <Text className="font-body-bold text-[14.5px] text-ink">{group.name}</Text>
                        <Text className="font-body text-[12px] text-ink-45">
                          {group.memberCount} thành viên
                        </Text>
                      </View>
                      <ChevronRight size={12} />
                    </>
                  ),
                }))}
              />
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
