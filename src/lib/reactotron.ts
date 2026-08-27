import AsyncStorage from '@react-native-async-storage/async-storage';
import Reactotron from 'reactotron-react-native';

import { SUPABASE_URL } from '@/lib/env';

const ignoredStorageKeys = ['@REACTOTRON/clientId'];

try {
  const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];
  if (projectRef) ignoredStorageKeys.push(`sb-${projectRef}-auth-token`);
} catch {
  // An invalid/missing Supabase URL is surfaced by the regular app startup UI.
}

/**
 * Development-only diagnostics. The root layout loads this module behind an
 * `__DEV__` guard, so production never opens Reactotron's WebSocket.
 *
 * Passing `globalThis.fetch` explicitly is important for Expo Router: Expo's
 * fetch implementation may be re-wrapped before Reactotron sees it, which
 * prevents automatic network detection.
 */
const reactotron = Reactotron.setAsyncStorageHandler(AsyncStorage)
  .configure({ name: 'Mido' })
  .useReactNative({
    // Never mirror persisted Supabase access/refresh tokens to the desktop app.
    asyncStorage: { ignore: ignoredStorageKeys },
    networking: {
      fetch: globalThis.fetch,
      // Metro/debugger traffic obscures the app's own API calls.
      ignoreUrls: /symbolicate|open-stack-frame|logs/i,
    },
    // Mido does not currently expose an overlay root or Storybook entrypoint.
    overlay: false,
    storybook: false,
  })
  .connect();

export default reactotron;
