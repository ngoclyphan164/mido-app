import { Tabs, useRouter } from 'expo-router';

import { MidoTabBar } from '@/components/ui/tab-bar';
import { useGroups } from '@/lib/api/queries';

export default function TabsLayout() {
  const router = useRouter();
  const groups = useGroups();

  /**
   * The centre action creates a kèo, which needs a group. With exactly one
   * group there's nothing to choose, so skip straight to the form.
   */
  function onCreate() {
    const list = groups.data ?? [];
    if (list.length === 0) router.push('/group/new');
    else if (list.length === 1) router.push(`/group/${list[0].id}/hangout/new`);
    else router.push('/groups');
  }

  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#FFF8F4' } }}
      tabBar={(props) => <MidoTabBar {...props} onCreate={onCreate} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="groups" />
      <Tabs.Screen name="fairness" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
