import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from 'expo-router';
import { useCallback, useRef } from 'react';
import type { GestureResponderEvent } from 'react-native';
import { Pressable, Text, View } from 'react-native';

import { GRADIENTS, HORIZONTAL, SHADOWS } from '@/theme/tokens';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Keeps the draggable track clear of iOS's back-swipe zone, which is roughly
 * the leftmost 20pt. Screen content already sits at 20px, so without this the
 * track starts exactly on the boundary and grabbing the knob at its minimum
 * competes with the navigator.
 */
const EDGE_INSET = 24;

/**
 * The per-person budget slider.
 *
 * Two things make it feel solid. The wrapper claims the touch responder and
 * everything it draws is inert, so `locationX` is measured from the track's
 * left edge whether the gesture starts as a tap or a drag. And `onChange` only
 * fires when the stepped value actually changes — a move event arrives every
 * frame, and re-rendering the whole form each time is what made dragging feel
 * sticky.
 */
export function BudgetSlider({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const trackWidth = useRef(0);
  const navigation = useNavigation();
  /** Last value handed to `onChange`; reading `value` here would lag a render. */
  const emitted = useRef(value);

  /**
   * Belt and braces alongside `EDGE_INSET`: once the knob is moving, nothing
   * should be able to pop the screen out from under it.
   */
  const setBackGesture = useCallback(
    (enabled: boolean) => {
      navigation.setOptions({ gestureEnabled: enabled });
    },
    [navigation],
  );

  function emit(next: number) {
    const stepped = clamp(Math.round(next / step) * step, min, max);
    if (stepped === emitted.current) return;
    emitted.current = stepped;
    onChange(stepped);
  }

  function commit(event: GestureResponderEvent) {
    const width = trackWidth.current;
    if (!width) return;
    const ratio = clamp(event.nativeEvent.locationX / width, 0, 1);
    emit(min + ratio * (max - min));
  }

  /** Tap targets for the exact value, and the only way in without dragging. */
  function nudge(direction: -1 | 1) {
    emitted.current = value;
    emit(value + direction * step);
  }

  const ratio = max > min ? clamp((value - min) / (max - min), 0, 1) : 0;

  return (
    <View className="flex-row items-center gap-1.5 py-1">
      <StepButton disabled={value <= min} label="−" onPress={() => nudge(-1)} />

      <View
        accessibilityRole="adjustable"
        accessibilityValue={{ min, max, now: value }}
        className="flex-1 py-3"
        onLayout={(event) => {
          trackWidth.current = event.nativeEvent.layout.width;
        }}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => {
          setBackGesture(false);
          emitted.current = value;
          commit(event);
        }}
        onResponderMove={commit}
        onResponderRelease={() => setBackGesture(true)}
        onResponderTerminate={() => setBackGesture(true)}
        // Nothing may steal the drag once the knob is moving.
        onResponderTerminationRequest={() => false}
        onStartShouldSetResponder={() => true}
        onStartShouldSetResponderCapture={() => true}
      >
        <View className="h-2 rounded-full bg-chip" pointerEvents="none">
          <LinearGradient
            colors={GRADIENTS.sliderTrack}
            end={HORIZONTAL.end}
            start={HORIZONTAL.start}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${ratio * 100}%`,
              borderRadius: 999,
            }}
          />
          <View
            className="absolute h-6 w-6 rounded-full border-[3px] border-coral bg-card"
            style={{ left: `${ratio * 100}%`, top: -8, marginLeft: -12, ...SHADOWS.knob }}
          />
        </View>
      </View>

      <StepButton disabled={value >= max} label="+" onPress={() => nudge(1)} />
    </View>
  );
}

/**
 * Sits between the screen edge and the track, which is what pushes the
 * draggable area out of the back-swipe zone — it earns its place twice.
 */
function StepButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label === '+' ? 'Tăng ngân sách' : 'Giảm ngân sách'}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className="h-9 items-center justify-center rounded-full bg-chip active:opacity-70"
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={{ width: EDGE_INSET + 8, opacity: disabled ? 0.4 : 1 }}
    >
      <Text className="font-body-bold text-[16px] leading-[20px] text-coral-dark">{label}</Text>
    </Pressable>
  );
}
