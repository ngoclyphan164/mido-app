import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Index() {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
      <View className="flex-1 items-center justify-center gap-3 px-6">
        <View className="rounded-full bg-blue-600 px-4 py-1.5">
          <Text className="text-xs font-semibold uppercase tracking-wide text-white">
            NativeWind
          </Text>
        </View>
        <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">mido</Text>
        <Text className="text-center text-sm text-neutral-500 dark:text-neutral-400">
          Edit src/app/index.tsx to edit this screen.
        </Text>
      </View>
    </SafeAreaView>
  );
}
