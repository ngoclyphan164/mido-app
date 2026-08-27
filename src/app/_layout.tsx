import '@/global.css';

import {
  Baloo2_600SemiBold,
  Baloo2_700Bold,
  Baloo2_800ExtraBold,
} from '@expo-google-fonts/baloo-2';
import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, Text, View } from 'react-native';

import { SessionProvider, useSession } from '@/lib/auth';
import { queryClient } from '@/lib/query-client';

// Providers do not make API/storage calls until render, so connecting here is
// early enough. `require` keeps the dev dependency behind the production guard.
if (__DEV__ && Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../lib/reactotron');
}

/**
 * One splash only: the native launch screen from app.json stays up until the
 * fonts are ready and the stored session has been read, then fades out.
 */
SplashScreen.preventAutoHideAsync();
// `fade` is iOS-only; Android ignores it and cuts straight to the app.
SplashScreen.setOptions({ duration: 400, fade: true });

function StartupError({ message }: { message: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-canvas px-8">
      <Text className="text-center font-heading text-[18px] text-ink">Chưa vào được Mido</Text>
      <Text className="text-center font-body text-[14px] leading-[21px] text-ink-60">
        {message}
      </Text>
    </View>
  );
}

function RootNavigator({ fontsSettled }: { fontsSettled: boolean }) {
  const { status, configError } = useSession();
  const ready = fontsSettled && status !== 'loading';

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;
  if (status === 'unconfigured') return <StartupError message={configError ?? ''} />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFF8F4' } }}>
      {/* Guards swap the whole tree, so signing out drops straight to sign-in. */}
      <Stack.Protected guard={status === 'signed-in'}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'signed-out'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  // Baloo 2 carries headings and buttons, Nunito the body copy.
  const [fontsLoaded, fontError] = useFonts({
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <View className="flex-1 bg-canvas">
          <RootNavigator fontsSettled={fontsLoaded || Boolean(fontError)} />
          <StatusBar style="dark" />
        </View>
      </SessionProvider>
    </QueryClientProvider>
  );
}
