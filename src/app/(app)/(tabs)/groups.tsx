import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/buttons';
import { ChevronRight } from '@/components/ui/icons';
import { ListGroup } from '@/components/ui/list-group';
import { useRefreshControl } from '@/components/ui/refresh';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useGroups } from '@/lib/api/queries';

export default function Groups() {
  const router = useRouter();
  const groups = useGroups();

  const refreshControl = useRefreshControl([groups]);

  return (
    <Screen>
      <ScreenHeader back={false} title="Nhóm của bạn" />

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
          <EmptyState hint="Tạo nhóm rồi mời bạn bè bằng mã mời." title="Chưa có nhóm nào" />
        ) : (
          <View className="px-5 pt-5">
            <ListGroup
              items={(groups.data ?? []).map((group) => ({
                key: group.id,
                onPress: () => router.push(`/group/${group.id}`),
                children: (
                  <>
                    <View className="flex-1">
                      <Text className="font-body-bold text-[14.5px] text-ink">{group.name}</Text>
                      <Text className="font-body text-[12px] text-ink-45">
                        {group.memberCount} thành viên · {group.role}
                      </Text>
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
        <PrimaryButton label="Tạo hoặc vào nhóm" onPress={() => router.push('/group/new')} />
      </View>
    </Screen>
  );
}
