import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';

import { AVATAR_PALETTE, SHADOWS } from '@/theme/tokens';

/**
 * Vòng quay may mắn: chọn ngẫu nhiên một trong các nhãn được truyền vào.
 *
 * QUY ƯỚC GÓC — mọi dấu trong file này phụ thuộc vào nó: θ = 0 ở 12 giờ và tăng
 * theo chiều kim đồng hồ. SVG có trục y hướng xuống, nên `rotate(a)` trong SVG,
 * `rotate: 'Adeg'` trong style React Native và θ tăng đều cùng một chiều.
 *
 * Component này không biết gì về quán xá: nó nhận nhãn, trả index.
 */

/** Quá số này thì tên quán không còn đọc nổi trên múi. */
export const WHEEL_MAX_SECTORS = 8;

const TURNS = 5;
const DURATION_MS = 3400;
/** Chừa chỗ cho nét viền ngoài khỏi bị cắt ở mép viewBox. */
const RIM_INSET = 6;

export type SpinWheelHandle = { spin: () => void };

type Phase =
  { phase: 'idle' } | { phase: 'spinning'; index: number } | { phase: 'landed'; index: number };

export type SpinWheelProps = {
  /** Nhãn từng múi, đúng thứ tự index mà `onSpinEnd` trả về. Cần 2–8 phần tử. */
  labels: string[];
  /** Cạnh hình vuông của bánh xe, px. */
  size?: number;
  disabled?: boolean;
  onSpinStart?: () => void;
  /** Chỉ gọi khi bánh xe dừng hẳn — không gọi khi lượt quay bị huỷ giữa chừng. */
  onSpinEnd: (index: number) => void;
};

/** Điểm trên đường tròn, θ tính từ 12 giờ theo chiều kim đồng hồ. */
function polar(c: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: c + r * Math.cos(rad), y: c + r * Math.sin(rad) };
}

/**
 * Hình quạt từ tâm. `sweep = 1` vì a0 → a1 là chiều kim đồng hồ trên màn hình;
 * `largeArc` luôn 0 khi có từ 2 múi trở lên vì mỗi múi rộng tối đa 180°.
 */
function sectorPath(c: number, r: number, a0: number, a1: number) {
  const p0 = polar(c, r, a0);
  const p1 = polar(c, r, a1);
  return `M ${c} ${c} L ${p0.x} ${p0.y} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${p1.x} ${p1.y} Z`;
}

/**
 * Múi kề nhau không được trùng màu. Bảng có 5 tông nên chỉ đúng một trường hợp
 * gãy: số múi chia 5 dư 1 thì múi cuối đụng múi đầu — đẩy nó sang màu kế.
 */
function toneFor(index: number, count: number) {
  const size = AVATAR_PALETTE.length;
  const wraps = index === count - 1 && count > size && count % size === 1;
  return AVATAR_PALETTE[(wraps ? index + 1 : index) % size];
}

/** SVG không có ellipsis, nên cắt tay theo số ký tự vừa với bán kính còn lại. */
function fitLabel(name: string, maxChars: number) {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (clean.length <= maxChars) return clean;
  const cut = clean.slice(0, maxChars - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > maxChars * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/**
 * Góc cần xoay tới để tia giữa múi `index` dừng đúng dưới kim ở 12 giờ.
 *
 * Kim đổi chỗ sang góc `p` thì công thức thành `(p - index * step + 360) % 360`;
 * `polar` đổi sang ngược chiều kim đồng hồ thì mọi dấu ở đây lật theo.
 */
function spinTarget(index: number, count: number, current: number) {
  const step = 360 / count;
  const base = (360 - index * step) % 360;
  const currentMod = ((current % 360) + 360) % 360;
  // Luôn là quãng dương: bánh xe chỉ tiến, không bao giờ giật ngược.
  const forward = (((base - currentMod) % 360) + 360) % 360;
  // Lệch nhẹ khỏi tâm múi cho đỡ máy móc, vẫn cách mép ±0.2 múi.
  const jitter = (Math.random() * 2 - 1) * step * 0.3;
  return current + TURNS * 360 + forward + jitter;
}

export const SpinWheel = forwardRef<SpinWheelHandle, SpinWheelProps>(function SpinWheel(
  { labels, size = 280, disabled = false, onSpinStart, onSpinEnd },
  ref,
) {
  const [rotation] = useState(() => new Animated.Value(0));
  const [phase, setPhase] = useState<Phase>({ phase: 'idle' });
  const [reduceMotion, setReduceMotion] = useState(false);
  /** Góc đang đứng yên, cộng dồn tuyệt đối chứ không mod về 0..360. */
  const restingRef = useRef(0);
  /** Chặn chạm kép đồng bộ: state React trong cùng một tick là giá trị cũ. */
  const spinningRef = useRef(false);

  const labelKey = labels.join('|');

  useEffect(() => {
    // Danh sách đổi giữa chừng thì kết quả cũ vô nghĩa. Giữ nguyên góc hiện tại
    // để lượt sau quay tiếp chứ không giật về 0. Cùng lời gọi này lo luôn việc
    // đóng modal khi đang quay: `stopAnimation` làm callback của `start` chạy
    // với `finished: false` nên không có kết quả rởm nào được báo lên.
    const stop = () => {
      rotation.stopAnimation((value) => {
        restingRef.current = value;
      });
      spinningRef.current = false;
    };
    stop();
    setPhase((current) => (current.phase === 'idle' ? current : { phase: 'idle' }));
    return stop;
  }, [labelKey, rotation]);

  useEffect(() => {
    // Đọc trong effect chứ không trong thân render: app có `web.output: "static"`
    // nên trang được prerender trong Node, mà ở đó react-native-web trả về true
    // vì không có DOM để hỏi `matchMedia`.
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (alive) setReduceMotion(value);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  function handleSpin() {
    const count = labels.length;
    if (spinningRef.current || disabled || count < 2) return;
    spinningRef.current = true;

    // Bốc index trước, animation chỉ là cách trình bày lựa chọn đó — không phải
    // quay đại rồi đọc xem kim dừng ở đâu.
    const index = Math.floor(Math.random() * count);
    const target = spinTarget(index, count, restingRef.current);

    setPhase({ phase: 'spinning', index });
    onSpinStart?.();

    const land = () => {
      restingRef.current = target;
      spinningRef.current = false;
      setPhase({ phase: 'landed', index });
      onSpinEnd(index);
    };

    if (reduceMotion) {
      rotation.setValue(target);
      land();
      return;
    }

    Animated.timing(rotation, {
      toValue: target,
      duration: DURATION_MS,
      easing: Easing.bezier(0.15, 0.9, 0.2, 1), // bung nhanh rồi rê dài
      // Web không có native animated module, để `true` chỉ tổ in warning.
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (!finished) {
        spinningRef.current = false;
        return;
      }
      land();
    });
  }

  useImperativeHandle(ref, () => ({ spin: handleSpin }));

  const count = labels.length;
  const spinning = phase.phase === 'spinning';
  const rotate = rotation.interpolate({
    inputRange: [0, 360],
    // Extrapolate mặc định là 'extend', nên 1800 ra đúng '1800deg'.
    outputRange: ['0deg', '360deg'],
  });

  if (count < 2) return null;

  const c = size / 2;
  const radius = c - RIM_INSET;
  const hubRadius = Math.round(size * 0.12);
  const step = 360 / count;
  const fontSize = count <= 4 ? 13 : count <= 6 ? 12 : 11;
  /** Chừa vành trong cho số thứ tự, vành ngoài cho nét viền. */
  const inner = hubRadius + 18;
  const outer = radius - 6;
  const labelRadius = (inner + outer) / 2;
  // ~0.52em là bề rộng trung bình đo được của Baloo 2 ở cỡ chữ này; dấu tiếng
  // Việt nằm trên dưới nên không ăn thêm bề ngang.
  const maxChars = Math.max(5, Math.floor((outer - inner) / (fontSize * 0.52)));

  return (
    <View style={{ height: size, width: size }}>
      <Animated.View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ height: size, transform: [{ rotate }], width: size }}
      >
        <Svg height={size} viewBox={`0 0 ${size} ${size}`} width={size}>
          {labels.map((label, index) => {
            const angle = index * step;
            const tone = toneFor(index, count);
            // Nửa trái thì lật 180° cho chữ khỏi dựng ngược đầu.
            const flip = angle > 180;
            const transform = `rotate(${flip ? angle + 90 : angle - 90} ${c} ${c})`;
            const sign = flip ? -1 : 1;

            return (
              <G key={`${index}:${label}`}>
                <Path
                  d={sectorPath(c, radius, angle - step / 2, angle + step / 2)}
                  fill={tone.bg}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
                <SvgText
                  dy={4}
                  fill={tone.fg}
                  fontFamily="Baloo2_600SemiBold"
                  fontSize={10}
                  opacity={0.7}
                  textAnchor="middle"
                  transform={transform}
                  x={c + sign * (hubRadius + 9)}
                  y={c}
                >
                  {String(index + 1)}
                </SvgText>
                <SvgText
                  // Căn dọc bằng `dy`: `alignmentBaseline` không đáng tin trên Android.
                  dy={fontSize * 0.35}
                  fill={tone.fg}
                  // Tên family do expo-font đăng ký. Class `font-heading` của
                  // NativeWind không có tác dụng bên trong <Svg>.
                  fontFamily="Baloo2_700Bold"
                  fontSize={fontSize}
                  textAnchor="middle"
                  // Dạng chuỗi chứ không phải originX/originY: trên web react-native-svg
                  // đổi hai prop đó thành `transform-origin: "140 140"` — số không đơn
                  // vị, CSS bỏ qua, nhãn xoay quanh gốc SVG thay vì tâm bánh xe.
                  transform={transform}
                  x={c + sign * labelRadius}
                  y={c}
                >
                  {fitLabel(label, maxChars)}
                </SvgText>
              </G>
            );
          })}

          {phase.phase === 'landed' ? (
            <Path
              d={sectorPath(
                c,
                radius,
                phase.index * step - step / 2,
                phase.index * step + step / 2,
              )}
              fill="none"
              stroke="#F0564F"
              strokeWidth={3}
            />
          ) : null}

          <Circle cx={c} cy={c} fill="none" r={radius} stroke="#FFFFFF" strokeWidth={4} />
        </Svg>
      </Animated.View>

      {/* Kim nằm ngoài view xoay: nó đứng yên, bánh xe mới là thứ quay. */}
      <View style={{ left: c - 11, pointerEvents: 'none', position: 'absolute', top: -4 }}>
        <Svg height={20} viewBox="0 0 22 20" width={22}>
          <Path d="M11 19 L2 2 L20 2 Z" fill="#F0564F" stroke="#FFFFFF" strokeWidth={2} />
        </Svg>
      </View>

      <Pressable
        accessibilityHint="Chạm để quay và chọn ngẫu nhiên"
        accessibilityLabel={`Vòng quay may mắn, ${count} lựa chọn`}
        accessibilityRole="button"
        accessibilityState={{ busy: spinning, disabled: disabled || spinning }}
        className="items-center justify-center rounded-full bg-card active:opacity-80"
        disabled={disabled || spinning}
        onPress={handleSpin}
        style={[
          SHADOWS.pill,
          {
            height: hubRadius * 2,
            left: c - hubRadius,
            position: 'absolute',
            top: c - hubRadius,
            width: hubRadius * 2,
          },
        ]}
      >
        <Text className="font-heading text-[13px] text-coral">QUAY</Text>
      </Pressable>
    </View>
  );
});
