import {
  BottomSheet,
  BottomSheetScrollView,
  BottomSheetView,
  type BottomSheetMethods,
} from '@expo/ui/community/bottom-sheet';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, Text, TextInput, View } from 'react-native';

import { LabeledInput } from '@/components/ui/form';
import { ListGroup } from '@/components/ui/list-group';
import { MapPin } from '@/components/ui/placeholders';
import { useSearchLocations } from '@/lib/api/queries';
import type { Coordinate, SearchLocationPlace } from '@/lib/api/types';
import { SHADOWS } from '@/theme/tokens';
import { FieldLabel } from '@/components/ui/typography';

type LocationSearchFieldProps = {
  center?: Coordinate;
  currentLocationError?: string | null;
  isLocating?: boolean;
  selectedLabel?: string;
  onSelect: (place: SearchLocationPlace) => void;
  onUseCurrentLocation: () => Promise<boolean>;
};

/**
 * A read-only location field whose editing flow lives in a modal bottom sheet.
 * The draft query is discarded on dismiss, so typing never changes the chosen
 * location until the member taps a search result.
 */
export function LocationSearchField({
  center,
  currentLocationError,
  isLocating = false,
  selectedLabel,
  onSelect,
  onUseCurrentLocation,
}: LocationSearchFieldProps) {
  const sheetRef = useRef<BottomSheetMethods>(null);
  const inputRef = useRef<TextInput>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const normalizedQuery = query.trim();
  const locationSearch = useSearchLocations(isOpen ? debouncedQuery : '', center);

  useEffect(() => {
    if (!isOpen) return;

    sheetRef.current?.present();
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(focusTimer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || normalizedQuery.length < 2) return;

    const searchTimer = setTimeout(() => setDebouncedQuery(normalizedQuery), 400);
    return () => clearTimeout(searchTimer);
  }, [isOpen, normalizedQuery]);

  const isWaitingForSearch =
    isOpen && normalizedQuery.length >= 2 && normalizedQuery !== debouncedQuery;
  const canShowSearchResponse =
    isOpen && normalizedQuery.length >= 2 && normalizedQuery === debouncedQuery;

  function openSearch() {
    setQuery('');
    setDebouncedQuery('');
    setIsOpen(true);
  }

  function closeSearch() {
    Keyboard.dismiss();
    sheetRef.current?.close();
  }

  function resetDraft() {
    setIsOpen(false);
    setQuery('');
    setDebouncedQuery('');
    Keyboard.dismiss();
  }

  function selectPlace(place: SearchLocationPlace) {
    onSelect(place);
    closeSearch();
  }

  async function handleCurrentLocation() {
    const didSelect = await onUseCurrentLocation();
    if (didSelect) closeSearch();
  }

  return (
    <View className="gap-2">
      <FieldLabel>Tìm địa điểm hoặc địa chỉ</FieldLabel>
      <Pressable
        accessibilityLabel="Tìm địa điểm hoặc địa chỉ"
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        className="flex-row items-center gap-3 rounded-[14px] bg-card px-4 py-[14px] active:opacity-70"
        onPress={openSearch}
        style={SHADOWS.field}
      >
        <Text
          className={
            selectedLabel
              ? 'flex-1 font-body text-[15px] text-ink'
              : 'flex-1 font-body text-[15px] text-ink-40'
          }
          numberOfLines={1}
        >
          {selectedLabel ?? 'Ví dụ: Landmark 81'}
        </Text>
        <MapPin size={16} />
      </Pressable>

      <BottomSheet
        backgroundStyle={{ backgroundColor: '#FFF8F4' }}
        enablePanDownToClose
        index={-1}
        onClose={resetDraft}
        ref={sheetRef}
        snapPoints={['85%']}
      >
        <BottomSheetView style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 24 }}>
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="font-heading text-[18px] text-ink">Tìm địa điểm</Text>
            <Pressable
              accessibilityRole="button"
              className="px-2 py-2 active:opacity-60"
              onPress={closeSearch}
            >
              <Text className="font-body-bold text-[13.5px] text-ink-50">Hủy</Text>
            </Pressable>
          </View>

          <LabeledInput
            autoCapitalize="words"
            autoCorrect={false}
            label="Địa điểm hoặc địa chỉ"
            maxLength={200}
            onChangeText={(value) => {
              setQuery(value);
              if (value.trim().length < 2) setDebouncedQuery('');
            }}
            onSubmitEditing={() => {
              if (normalizedQuery.length >= 2) setDebouncedQuery(normalizedQuery);
            }}
            placeholder="Nhập tên địa điểm hoặc địa chỉ"
            ref={inputRef}
            returnKeyType="search"
            trailing={
              isWaitingForSearch || locationSearch.isFetching ? (
                <ActivityIndicator color="#F0564F" size="small" />
              ) : undefined
            }
            value={query}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isLocating }}
            className="mt-3 flex-row items-center gap-3 rounded-[14px] bg-card px-[14px] py-3 active:opacity-70 disabled:opacity-50"
            disabled={isLocating}
            onPress={() => void handleCurrentLocation()}
            style={SHADOWS.field}
          >
            <View className="h-8 w-8 items-center justify-center rounded-full bg-coral-soft">
              {isLocating ? (
                <ActivityIndicator color="#F0564F" size="small" />
              ) : (
                <MapPin size={15} />
              )}
            </View>
            <View className="flex-1">
              <Text className="font-body-bold text-[14px] text-coral-dark">
                {isLocating ? 'Đang lấy vị trí…' : 'Dùng vị trí hiện tại'}
              </Text>
              <Text className="font-body text-[12px] text-ink-50">
                Lấy lại tọa độ GPS của thiết bị
              </Text>
            </View>
          </Pressable>

          {currentLocationError ? (
            <Text className="mt-2 font-body text-[12px] text-coral-dark">
              {currentLocationError}
            </Text>
          ) : null}

          <BottomSheetScrollView
            contentContainerStyle={{ paddingTop: 14, paddingBottom: 12 }}
            keyboardShouldPersistTaps="handled"
            style={{ flex: 1 }}
          >
            {normalizedQuery.length < 2 ? (
              <Text className="font-body text-[12.5px] text-ink-45">
                Nhập ít nhất 2 ký tự để bắt đầu tìm kiếm.
              </Text>
            ) : null}

            {canShowSearchResponse && locationSearch.isError ? (
              <Text className="font-body text-[12.5px] text-coral-dark">
                Không tìm được địa điểm. Hãy thử lại.
              </Text>
            ) : null}

            {canShowSearchResponse && locationSearch.data?.places.length === 0 ? (
              <Text className="font-body text-[12.5px] text-ink-45">Không có kết quả phù hợp.</Text>
            ) : null}

            {canShowSearchResponse && locationSearch.data?.places.length ? (
              <View className="gap-2">
                <ListGroup
                  items={locationSearch.data.places.map((place) => ({
                    key: `${place.provider}:${place.placeId}`,
                    onPress: () => selectPlace(place),
                    children: (
                      <>
                        <View className="h-8 w-8 items-center justify-center">
                          <MapPin size={16} />
                        </View>
                        <View className="flex-1">
                          <Text className="font-body-bold text-[14px] text-ink" numberOfLines={1}>
                            {place.name}
                          </Text>
                          {place.address ? (
                            <Text className="font-body text-[12px] text-ink-50" numberOfLines={2}>
                              {place.address}
                            </Text>
                          ) : null}
                        </View>
                      </>
                    ),
                  }))}
                />
                <Text className="text-right font-body text-[10.5px] text-ink-40">
                  Dữ liệu từ {locationSearch.data.attribution}
                </Text>
              </View>
            ) : null}
          </BottomSheetScrollView>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}
