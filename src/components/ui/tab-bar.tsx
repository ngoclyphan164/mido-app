import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FairnessIcon, GroupsIcon, HomeIcon, ProfileIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { DIAGONAL, GRADIENTS, SHADOWS } from '@/theme/tokens';

const ACTIVE = '#F0564F';
const INACTIVE = 'rgba(43,20,32,0.4)';

const ICONS = {
  index: HomeIcon,
  groups: GroupsIcon,
  fairness: FairnessIcon,
  profile: ProfileIcon,
} as const;

const LABELS = {
  index: 'Trang chủ',
  groups: 'Nhóm',
  fairness: 'Công bằng',
  profile: 'Cá nhân',
} as const;

type TabName = keyof typeof ICONS;

/**
 * Expo Router 57 vendors its navigation core, so there is no
 * `@react-navigation/bottom-tabs` to import the prop type from. Declaring just
 * the parts this bar reads keeps it decoupled from those internals; the real
 * props are a superset.
 */
type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: { navigate: (name: string) => void };
  onCreate: () => void;
};

/** The design splits the four tabs two-and-two around a raised centre action. */
const LEFT: TabName[] = ['index', 'groups'];
const RIGHT: TabName[] = ['fairness', 'profile'];

/**
 * Custom bar rather than the default one, because the design's centre "+"
 * overhangs the bar by 30px and isn't a route.
 */
export function MidoTabBar({ state, navigation, onCreate }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const activeName = state.routes[state.index]?.name;

  const item = (name: TabName) => {
    const Icon = ICONS[name];
    const focused = activeName === name;
    const color = focused ? ACTIVE : INACTIVE;
    return (
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        className="flex-1 items-center gap-1 active:opacity-60"
        key={name}
        onPress={() => navigation.navigate(name)}
      >
        <Icon color={color} />
        <Text className={cn('font-body-bold text-[10.5px]')} style={{ color }}>
          {LABELS[name]}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      className="flex-row items-center border-t border-ink-08 bg-canvas px-5 pt-3.5"
      style={{ paddingBottom: Math.max(insets.bottom, 14) }}
    >
      {LEFT.map(item)}

      <Pressable
        accessibilityLabel="Tạo kèo mới"
        accessibilityRole="button"
        className="active:opacity-85"
        onPress={onCreate}
        // Overhangs the bar, exactly as drawn. The shadow lives on the gradient
        // below, which is the round element; on the square Pressable it would
        // render as a visible box.
        style={{ marginTop: -30 }}
      >
        <LinearGradient
          colors={GRADIENTS.cta}
          end={DIAGONAL.end}
          start={DIAGONAL.start}
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            alignItems: 'center',
            justifyContent: 'center',
            ...SHADOWS.fab,
          }}
        >
          <Text className="font-body text-[26px] leading-[30px] text-card">+</Text>
        </LinearGradient>
      </Pressable>

      {RIGHT.map(item)}
    </View>
  );
}
