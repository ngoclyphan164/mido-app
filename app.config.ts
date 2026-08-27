import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * app.json stays the static base; this file only adds what has to come from the
 * environment. The react-native-maps config plugin needs the Google Maps key at
 * prebuild time, and static JSON can't read `process.env`.
 *
 * Expo CLI loads .env before evaluating this file, so EXPO_PUBLIC_* is available.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!googleMapsApiKey) {
    // Warn rather than throw: `expo lint` and typecheck shouldn't need the key.
    console.warn('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is not set — maps will render blank tiles.');
  }

  return {
    ...config,
    name: config.name ?? 'mido',
    slug: config.slug ?? 'mido',
    plugins: [
      ...(config.plugins ?? []),
      [
        'react-native-maps',
        {
          // Google Maps on both platforms: the API's Places/Routes terms require
          // their content to be shown on a Google map with proper attribution,
          // which rules out Apple Maps here.
          androidGoogleMapsApiKey: googleMapsApiKey,
          iosGoogleMapsApiKey: googleMapsApiKey,
        },
      ],
      [
        'expo-location',
        {
          locationWhenInUsePermission: 'Cho phép Mido dùng vị trí của bạn để chọn điểm xuất phát.',
        },
      ],
    ],
  };
};
