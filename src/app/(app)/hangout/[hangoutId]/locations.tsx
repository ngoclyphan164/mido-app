import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { OutlineButton, PrimaryButton } from '@/components/ui/buttons';
import { ChoiceChips } from '@/components/ui/controls';
import { Check, MoreDots } from '@/components/ui/icons';
import { ListGroup } from '@/components/ui/list-group';
import { LocationSearchField } from '@/components/ui/location-search-field';
import { MapPreview } from '@/components/ui/map-preview';
import { MapPin } from '@/components/ui/placeholders';
import { useRefreshControl } from '@/components/ui/refresh';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { SectionTitle } from '@/components/ui/typography';
import { activityLabel, hueIndexFor, initialOf } from '@/lib/api/present';
import {
  useHangout,
  useMe,
  useParticipantsRealtime,
  useSetOwnParticipant,
} from '@/lib/api/queries';
import type { Coordinate, Participant, SearchLocationPlace } from '@/lib/api/types';
import { TRAVEL_MODE_LABELS } from '@/lib/api/types';
import { TRAVEL_MODES } from '@/lib/ui-config';
import { useHangoutStore } from '@/store/use-hangout-store';
import { SHADOWS } from '@/theme/tokens';

/** Last-resort fallback when location access is unavailable. */
const DEFAULT_COORD = { lat: 10.7769, lng: 106.7009 };
const reverseGeocodeCache = new Map<string, string>();

function coordinateKey(coord: Coordinate) {
  return `${coord.lat.toFixed(6)},${coord.lng.toFixed(6)}`;
}

async function getDeviceCurrentCoordinate(): Promise<Coordinate> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== Location.PermissionStatus.GRANTED) {
    throw new Error('Không có quyền truy cập vị trí.');
  }

  const current = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return {
    lat: current.coords.latitude,
    lng: current.coords.longitude,
  };
}

function formatGeocodedAddress(address: Location.LocationGeocodedAddress): string | undefined {
  if (address.formattedAddress?.trim()) return address.formattedAddress.trim().slice(0, 512);

  const street = [address.streetNumber, address.street]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
  const seen = new Set<string>();
  const parts = [
    address.name,
    street,
    address.district,
    address.subregion,
    address.city,
    address.region,
    address.country,
  ].flatMap((part) => {
    const value = part?.trim();
    if (!value || seen.has(value.toLocaleLowerCase())) return [];
    seen.add(value.toLocaleLowerCase());
    return [value];
  });

  return parts.length ? parts.join(', ').slice(0, 512) : undefined;
}

async function reverseGeocodeCoordinate(coord: Coordinate): Promise<string | undefined> {
  // Expo Location does not expose reverse geocoding on web. A web member can
  // still select a Places search result, whose formatted address is retained.
  if (Platform.OS === 'web') return undefined;

  try {
    const [address] = await Location.reverseGeocodeAsync({
      latitude: coord.lat,
      longitude: coord.lng,
    });
    return address ? formatGeocodedAddress(address) : undefined;
  } catch {
    return undefined;
  }
}

type AddressFallback = { coordinateKey: string; address: string | null };

/** Resolve legacy participant rows that predate `origin_address`. */
function useParticipantAddressFallbacks(participants: Participant[], enabled: boolean) {
  const [fallbacks, setFallbacks] = useState<Record<string, AddressFallback>>({});

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function resolveMissingAddresses() {
      // Expo recommends avoiding many concurrent geocoding calls. A hangout is
      // capped at 10 participants, so resolve missing legacy rows sequentially.
      for (const participant of participants) {
        if (cancelled || participant.originAddress) continue;

        const key = coordinateKey(participant.origin);
        const current = fallbacks[participant.id];
        if (current?.coordinateKey === key) continue;

        const cached = reverseGeocodeCache.get(key);
        const address = cached ?? (await reverseGeocodeCoordinate(participant.origin));
        if (address) reverseGeocodeCache.set(key, address);
        if (cancelled) return;

        setFallbacks((previous) => ({
          ...previous,
          [participant.id]: { coordinateKey: key, address: address ?? null },
        }));
      }
    }

    void resolveMissingAddresses();
    return () => {
      cancelled = true;
    };
  }, [enabled, fallbacks, participants]);

  return fallbacks;
}

function locationErrorMessage(error: unknown) {
  return error instanceof Error && error.message === 'Không có quyền truy cập vị trí.'
    ? error.message
    : 'Không thể lấy vị trí hiện tại.';
}

export default function Locations() {
  const router = useRouter();
  const { hangoutId } = useLocalSearchParams<{ hangoutId: string }>();
  const { travelModeIndex, setTravelModeIndex } = useHangoutStore();

  const hangout = useHangout(hangoutId);
  useParticipantsRealtime(hangoutId);
  const me = useMe();
  const saveParticipant = useSetOwnParticipant(hangoutId);
  // Màn này chủ yếu là ngồi chờ người khác nhập vị trí, nên kéo để xem ai đã vào.
  const refreshControl = useRefreshControl([hangout, me]);

  const myUserId = me.data?.user.id;
  const myParticipant = hangout.data?.participants.find((p) => p.userId === myUserId);
  // A manually picked point wins over the GPS default for the rest of this visit.
  const [pickedCoord, setPickedCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [currentCoord, setCurrentCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedLocationLabel, setSelectedLocationLabel] = useState<string>();
  const [selectedOriginAddress, setSelectedOriginAddress] = useState<string>();
  const participantAddressFallbacks = useParticipantAddressFallbacks(
    hangout.data?.participants ?? [],
    !isLocating,
  );

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentLocation() {
      try {
        const current = await getDeviceCurrentCoordinate();
        if (!cancelled) {
          setCurrentCoord(current);
          setSelectedLocationLabel('Vị trí hiện tại');
        }
        const address = await reverseGeocodeCoordinate(current);
        if (!cancelled && address) {
          setSelectedLocationLabel(address);
          setSelectedOriginAddress(address);
        }
      } catch (error) {
        if (!cancelled) setLocationError(locationErrorMessage(error));
      } finally {
        if (!cancelled) setIsLocating(false);
      }
    }

    void loadCurrentLocation();
    return () => {
      cancelled = true;
    };
  }, []);

  const coord = pickedCoord ?? currentCoord ?? myParticipant?.origin ?? DEFAULT_COORD;
  const hasUserCoord = Boolean(pickedCoord ?? currentCoord ?? myParticipant?.origin);
  const isWaitingForDefault = isLocating && !pickedCoord;
  const searchCenter = hasUserCoord ? coord : undefined;

  function selectSearchResult(place: SearchLocationPlace) {
    const address = (place.address?.trim() || place.name.trim()).slice(0, 512);
    setPickedCoord(place.location);
    setSelectedLocationLabel(address);
    setSelectedOriginAddress(address);
    setLocationError(null);
  }

  async function handleCurrentLocation() {
    setIsLocating(true);
    setLocationError(null);

    try {
      const current = await getDeviceCurrentCoordinate();
      setCurrentCoord(current);
      setPickedCoord(null);
      setSelectedLocationLabel('Vị trí hiện tại');
      const address = await reverseGeocodeCoordinate(current);
      setSelectedOriginAddress(address);
      if (address) setSelectedLocationLabel(address);
      return true;
    } catch (error) {
      setLocationError(locationErrorMessage(error));
      return false;
    } finally {
      setIsLocating(false);
    }
  }

  function pickCoordOnMap(nextCoord: { lat: number; lng: number }) {
    setPickedCoord(nextCoord);
    setSelectedLocationLabel(undefined);
    setSelectedOriginAddress(undefined);
    setLocationError(null);
  }

  async function handleSaveParticipant() {
    setIsResolvingAddress(true);
    setLocationError(null);

    try {
      const storedAddress =
        selectedOriginAddress ??
        (!pickedCoord && !currentCoord ? myParticipant?.originAddress : undefined);
      const originAddress = storedAddress ?? (await reverseGeocodeCoordinate(coord));

      if (!originAddress) {
        setLocationError(
          'Không thể xác định địa chỉ. Hãy tìm và chọn một địa điểm hoặc địa chỉ cụ thể.',
        );
        return;
      }

      setSelectedOriginAddress(originAddress);
      setSelectedLocationLabel(originAddress);
      await saveParticipant.mutateAsync({
        lat: coord.lat,
        lng: coord.lng,
        originAddress,
        travelMode: TRAVEL_MODES[travelModeIndex].value,
      });
    } catch {
      // The mutation already exposes its API error through saveParticipant.error.
    } finally {
      setIsResolvingAddress(false);
    }
  }

  const pendingNames = (hangout.data?.pendingMembers ?? [])
    .map((member) => member.displayName)
    .join(' & ');
  const waiting = hangout.data?.pendingMembers.length ?? 0;
  const participantCount = hangout.data?.participants.length ?? 0;
  // The suggest pipeline refuses anything outside 2..10 participants.
  const canSuggest = participantCount >= 2;

  if (hangout.isPending) {
    return (
      <Screen>
        <ScreenHeader title="Vị trí xuất phát" />
        <LoadingState label="Đang tải kèo…" />
      </Screen>
    );
  }

  if (hangout.isError || !hangout.data) {
    return (
      <Screen>
        <ScreenHeader title="Vị trí xuất phát" />
        <ErrorState error={hangout.error} onRetry={hangout.refetch} />
      </Screen>
    );
  }

  const detail = hangout.data;
  // Mirrors the API's rule for PATCH/DELETE on a kèo; the edit screen re-checks
  // the status, so the entry point only gates on who is asking.
  const canManageHangout =
    detail.createdBy === myUserId || detail.role === 'owner' || detail.role === 'admin';

  return (
    <Screen>
      <ScreenHeader
        right={
          canManageHangout ? (
            <Pressable
              accessibilityLabel="Sửa hoặc xoá kèo"
              accessibilityRole="button"
              className="h-9 w-9 items-center justify-center rounded-full bg-card active:opacity-70"
              hitSlop={8}
              onPress={() => router.push(`/hangout/${hangoutId}/edit`)}
              style={SHADOWS.pill}
            >
              <MoreDots />
            </Pressable>
          ) : null
        }
        subtitle={`${detail.participants.length + waiting} người · ${activityLabel(detail.activityType)}`}
        title="Vị trí xuất phát"
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-4"
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
      >
        <View className="px-5 pt-5">
          <ListGroup
            items={[
              ...detail.participants.map((participant) => ({
                key: participant.id,
                children: (() => {
                  const fallback = participantAddressFallbacks[participant.id];
                  const isCurrentFallback =
                    fallback?.coordinateKey === coordinateKey(participant.origin);
                  const address =
                    participant.originAddress ??
                    (isCurrentFallback ? (fallback.address ?? undefined) : undefined);
                  const addressLabel = address
                    ? address
                    : isCurrentFallback
                      ? 'Chưa xác định được địa chỉ'
                      : 'Đang xác định địa chỉ…';

                  return (
                    <>
                      <Avatar
                        hueIndex={hueIndexFor(participant.userId)}
                        initial={initialOf(participant.displayName)}
                      />
                      <View className="flex-1">
                        <Text className="font-body-bold text-[14.5px] text-ink">
                          {participant.displayName}
                        </Text>
                        <Text className="font-body text-[12.5px] text-ink-50" numberOfLines={2}>
                          {addressLabel}
                        </Text>
                        <Text className="font-body text-[11.5px] text-ink-40">
                          {TRAVEL_MODE_LABELS[participant.travelMode]}
                        </Text>
                      </View>
                      <View className="h-5 w-5 items-center justify-center rounded-full bg-check-bg">
                        <Check />
                      </View>
                    </>
                  );
                })(),
              })),
              ...detail.pendingMembers.map((member) => ({
                key: member.userId,
                children: (
                  <>
                    <Avatar
                      hueIndex={hueIndexFor(member.userId)}
                      initial={initialOf(member.displayName)}
                    />
                    <View className="flex-1">
                      <Text className="font-body-bold text-[14.5px] text-ink">
                        {member.displayName}
                      </Text>
                      <Text className="font-body text-[12.5px] text-amber-text">
                        Đang chờ nhập vị trí
                      </Text>
                    </View>
                    <View className="h-2 w-2 rounded-full bg-amber-dot" />
                  </>
                ),
              })),
            ]}
          />
        </View>

        <View className="gap-2.5 px-5 pt-[22px]">
          <SectionTitle>Vị trí của bạn</SectionTitle>
          <LocationSearchField
            center={searchCenter}
            currentLocationError={locationError}
            isLocating={isLocating}
            onSelect={selectSearchResult}
            onUseCurrentLocation={handleCurrentLocation}
            selectedLabel={selectedLocationLabel}
          />
          <View className="relative">
            <MapPreview
              coord={coord}
              height={320}
              interactive
              onPickCoord={pickCoordOnMap}
              spanKm={1.2}
            />
            <Pressable
              accessibilityLabel="Dùng vị trí hiện tại"
              accessibilityRole="button"
              accessibilityState={{ disabled: isLocating }}
              className="absolute bottom-3 right-3 h-11 w-11 items-center justify-center rounded-full bg-card active:opacity-70 disabled:opacity-50"
              disabled={isLocating}
              onPress={() => void handleCurrentLocation()}
              style={SHADOWS.pill}
            >
              {isLocating ? (
                <ActivityIndicator color="#F0564F" size="small" />
              ) : (
                <MapPin size={17} />
              )}
            </Pressable>
          </View>
          <Text className="font-body text-[12px] text-ink-45">
            {pickedCoord
              ? selectedLocationLabel
                ? `Đã chọn ${selectedLocationLabel}.`
                : 'Đã chọn điểm xuất phát trên bản đồ.'
              : isLocating
                ? 'Đang lấy vị trí hiện tại…'
                : locationError
                  ? `${locationError} ${myParticipant?.origin ? 'Đang dùng điểm đã lưu gần nhất.' : 'Chạm vào bản đồ để chọn điểm xuất phát.'}`
                  : 'Đang dùng vị trí hiện tại. Chạm vào bản đồ để thay đổi.'}
          </Text>
          <ChoiceChips
            onChange={setTravelModeIndex}
            options={TRAVEL_MODES.map((mode) => mode.label)}
            size="sm"
            value={travelModeIndex}
          />
          <OutlineButton
            disabled={
              isWaitingForDefault ||
              !hasUserCoord ||
              isResolvingAddress ||
              saveParticipant.isPending
            }
            label={
              isWaitingForDefault
                ? 'Đang lấy vị trí…'
                : !hasUserCoord
                  ? 'Chọn vị trí để tiếp tục'
                  : isResolvingAddress
                    ? 'Đang xác định địa chỉ…'
                    : saveParticipant.isPending
                      ? 'Đang lưu…'
                      : 'Lưu vị trí của tôi'
            }
            onPress={() => void handleSaveParticipant()}
          />
          {saveParticipant.error ? <ErrorState error={saveParticipant.error} /> : null}
        </View>
      </ScrollView>

      <View className="gap-2.5 px-5 pb-8 pt-[18px]">
        {waiting > 0 ? (
          <OutlineButton
            label={`Kiểm tra lại · ${pendingNames}`}
            onPress={() => void hangout.refetch()}
            tone="neutral"
          />
        ) : null}
        <PrimaryButton
          disabled={!canSuggest}
          label={canSuggest ? 'Xem gợi ý' : `Xem gợi ý (cần ${2 - participantCount} người nữa)`}
          onPress={() => router.push(`/hangout/${hangoutId}/suggestions`)}
        />
      </View>
    </Screen>
  );
}
