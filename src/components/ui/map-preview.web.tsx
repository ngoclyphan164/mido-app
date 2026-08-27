import { Placeholder } from '@/components/ui/placeholders';

import type { MapPreviewProps } from '@/components/ui/map-preview';

/**
 * react-native-maps has no web implementation, so the browser preview falls
 * back to the design's hatched placeholder. Keep the props identical to the
 * native component.
 */
export function MapPreview({ height, radius = 16, className }: MapPreviewProps) {
  return <Placeholder className={className} height={height} label="bản đồ" pin radius={radius} />;
}
