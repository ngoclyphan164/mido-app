import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { cn } from '@/lib/cn';

export type ListGroupItem = {
  key: string;
  onPress?: () => void;
  children: ReactNode;
};

/**
 * The design's grouped list: white rows separated by a 2px canvas gap, with
 * only the outer corners rounded so the group reads as one card.
 */
export function ListGroup({
  items,
  radius = 16,
  className,
}: {
  items: ListGroupItem[];
  radius?: number;
  className?: string;
}) {
  return (
    <View className={cn('gap-[2px]', className)}>
      {items.map((item, index) => {
        const first = index === 0;
        const last = index === items.length - 1;
        const corners = {
          borderTopLeftRadius: first ? radius : 0,
          borderTopRightRadius: first ? radius : 0,
          borderBottomLeftRadius: last ? radius : 0,
          borderBottomRightRadius: last ? radius : 0,
        };

        if (item.onPress) {
          return (
            <Pressable
              accessibilityRole="button"
              className="flex-row items-center gap-3 bg-card px-[14px] py-3 active:opacity-70"
              key={item.key}
              onPress={item.onPress}
              style={corners}
            >
              {item.children}
            </Pressable>
          );
        }

        return (
          <View
            className="flex-row items-center gap-3 bg-card px-[14px] py-3"
            key={item.key}
            style={corners}
          >
            {item.children}
          </View>
        );
      })}
    </View>
  );
}
