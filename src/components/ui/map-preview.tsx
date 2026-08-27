import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { MapPin } from '@/components/ui/placeholders';
import { cn } from '@/lib/cn';

export type MapMarker = {
  id: string;
  coord: { lat: number; lng: number };
  color?: string;
};

export type MapPreviewProps = {
  coord: { lat: number; lng: number };
  /** Defaults to a single pin on `coord`. */
  markers?: MapMarker[];
  height?: number;
  radius?: number;
  className?: string;
  /** The design draws these as static thumbnails, so panning is off by default. */
  interactive?: boolean;
  /** When set, tapping the map reports the tapped coordinate. */
  onPickCoord?: (coord: { lat: number; lng: number }) => void;
  /** Rough width of the visible area, in kilometres. */
  spanKm?: number;
};

/** 1 degree of latitude is ~111 km; close enough for a thumbnail's zoom level. */
const KM_PER_DEGREE = 111;

/**
 * Google Maps on both platforms, deliberately: the API's Places and Routes
 * terms require their content to be displayed on a Google map with attribution,
 * which rules out Apple Maps for this app.
 */
export function MapPreview({
  coord,
  markers,
  height,
  radius = 16,
  className,
  interactive = false,
  onPickCoord,
  spanKm = 1.6,
}: MapPreviewProps) {
  const delta = spanKm / KM_PER_DEGREE;
  const pins = markers ?? [{ id: 'centre', coord }];
  const mapRef = useRef<MapView>(null);

  // `initialRegion` is only read on mount. Move the camera when an async GPS
  // result (or a newly picked point) changes the centre coordinate.
  useEffect(() => {
    mapRef.current?.animateToRegion(
      {
        latitude: coord.lat,
        longitude: coord.lng,
        latitudeDelta: delta,
        longitudeDelta: delta,
      },
      250,
    );
  }, [coord.lat, coord.lng, delta]);

  return (
    <View className={cn('overflow-hidden', className)} style={{ height, borderRadius: radius }}>
      <MapView
        ref={mapRef}
        initialRegion={{
          latitude: coord.lat,
          longitude: coord.lng,
          latitudeDelta: delta,
          longitudeDelta: delta,
        }}
        // liteMode renders a static bitmap instead of a live map. Android only,
        // and much cheaper for something the size of a card thumbnail.
        // liteMode can't receive taps, so it's only for read-only thumbnails.
        liteMode={Platform.OS === 'android' && !interactive && !onPickCoord}
        onPress={
          onPickCoord
            ? (event) => {
                const { latitude, longitude } = event.nativeEvent.coordinate;
                onPickCoord({ lat: latitude, lng: longitude });
              }
            : undefined
        }
        pitchEnabled={false}
        provider={PROVIDER_GOOGLE}
        rotateEnabled={false}
        scrollEnabled={interactive}
        style={StyleSheet.absoluteFill}
        toolbarEnabled={false}
        zoomEnabled={interactive}
      >
        {pins.map((pin) => (
          <Marker
            anchor={{ x: 0.5, y: 0.9 }}
            coordinate={{ latitude: pin.coord.lat, longitude: pin.coord.lng }}
            key={pin.id}
            // Custom marker views re-render on every frame without this.
            tracksViewChanges={false}
          >
            {/* The pin is rotated, so it needs room not to clip inside the marker. */}
            <View className="h-8 w-8 items-center justify-center">
              <MapPin color={pin.color} />
            </View>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}
