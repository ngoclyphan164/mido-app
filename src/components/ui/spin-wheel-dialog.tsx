import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Modal,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { PrimaryButton, TextLink } from '@/components/ui/buttons';
import { PlaceCard } from '@/components/ui/place-card';
import { SpinWheel, type SpinWheelHandle } from '@/components/ui/spin-wheel';
import type { StoredSuggestion } from '@/lib/api/types';
import { cn } from '@/lib/cn';
import { SHADOWS } from '@/theme/tokens';

type DialogProps = {
  visible: boolean;
  /** Đã cắt còn tối đa WHEEL_MAX_SECTORS ở phía màn gọi. */
  options: StoredSuggestion[];
  onClose: () => void;
  onPick: (suggestion: StoredSuggestion) => void;
};

/**
 * Vòng quay chọn quán hộ khi cả nhóm lưỡng lự.
 *
 * Nó chỉ chọn rồi dẫn sang màn chi tiết chứ không chốt kèo: một người quay không
 * được quyết thay cả nhóm, `useDecideHangout` vẫn nằm nguyên ở màn chi tiết quán.
 */
export function SpinWheelDialog({ visible, options, onClose, onPick }: DialogProps) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: 'rgba(43,20,32,0.35)' }}
      >
        {/* Ruột chỉ dựng khi mở, và đóng lại là unmount: mỗi lần mở là một bánh
            xe mới tinh, khỏi phải effect nào đi dọn kết quả lượt trước. */}
        {visible ? <WheelBody onClose={onClose} onPick={onPick} options={options} /> : null}
      </View>
    </Modal>
  );
}

function WheelBody({ options, onClose, onPick }: Omit<DialogProps, 'visible'>) {
  const { height, width } = useWindowDimensions();
  const wheelRef = useRef<SpinWheelHandle>(null);
  const [chosen, setChosen] = useState<StoredSuggestion | null>(null);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    if (!chosen) return;
    // liveRegion bên dưới lo Android với web; iOS bỏ qua nên phải đọc tay.
    AccessibilityInfo.announceForAccessibility(`Vòng quay chọn ${chosen.name}`);
  }, [chosen]);

  return (
    <View className="w-full rounded-sheet bg-card" style={SHADOWS.card}>
      <ScrollView contentContainerClassName="gap-4 p-5" style={{ maxHeight: height * 0.85 }}>
        <View className="gap-1">
          <Text className="font-heading text-[17px] text-ink">Để Mido chọn giúp</Text>
          <Text className="font-body text-[13px] leading-[19px] text-ink-60">
            {`Quay ngẫu nhiên trong ${options.length} quán hợp nhất với cả nhóm.`}
          </Text>
        </View>

        <View className="items-center">
          <SpinWheel
            labels={options.map((option) => option.name)}
            onSpinEnd={(index) => {
              setSpinning(false);
              setChosen(options[index] ?? null);
            }}
            onSpinStart={() => {
              setSpinning(true);
              setChosen(null);
            }}
            ref={wheelRef}
            size={Math.min(280, width - 100)}
          />
        </View>

        {chosen ? (
          <View accessibilityLiveRegion="polite" className="gap-2">
            <Text className="text-center font-body text-[12.5px] text-ink-55">Vòng quay chọn</Text>
            <PlaceCard onPress={() => onPick(chosen)} suggestion={chosen} />
          </View>
        ) : (
          // Số thứ tự trên múi chỉ để đối chiếu, tên đầy đủ nằm ở đây.
          <View className="gap-1">
            {options.map((option, index) => (
              <Text
                className={cn(
                  'font-body text-[12.5px] leading-[18px]',
                  spinning ? 'text-ink-45' : 'text-ink-55',
                )}
                key={option.suggestionId}
                numberOfLines={1}
              >
                {`${index + 1}. ${option.name}`}
              </Text>
            ))}
          </View>
        )}

        <View className="gap-2.5">
          {chosen ? (
            <PrimaryButton label="Xem quán" onPress={() => onPick(chosen)} />
          ) : (
            <PrimaryButton
              disabled={spinning}
              label={spinning ? 'Đang quay…' : 'Quay đi!'}
              onPress={() => wheelRef.current?.spin()}
            />
          )}
          <View className="flex-row items-center justify-center gap-5">
            {chosen ? (
              <TextLink label="Quay lại lần nữa" onPress={() => wheelRef.current?.spin()} />
            ) : null}
            <TextLink label="Đóng" onPress={onClose} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
