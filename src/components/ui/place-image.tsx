import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Placeholder } from '@/components/ui/placeholders';
import { cn } from '@/lib/cn';

/** Remote venue image with the existing hatched artwork as a resilient fallback. */
export function PlaceImage({
  uri,
  accessibilityLabel,
  className,
  radius = 12,
  style,
}: {
  uri?: string;
  accessibilityLabel: string;
  className?: string;
  radius?: number;
  style?: ViewStyle;
}) {
  const [failedUri, setFailedUri] = useState<string>();
  const showFallback = !uri || failedUri === uri;

  return (
    <View
      className={cn('overflow-hidden bg-canvas', className)}
      style={[{ borderRadius: radius }, style]}
    >
      {showFallback ? (
        <Placeholder className="absolute inset-0" radius={radius} stripe={6} />
      ) : (
        <Image
          accessibilityLabel={accessibilityLabel}
          cachePolicy="memory-disk"
          contentFit="cover"
          onError={() => setFailedUri(uri)}
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          transition={180}
        />
      )}
    </View>
  );
}
