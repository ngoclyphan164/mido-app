import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, Share, Text, View } from 'react-native';

import { Card, MonoText } from '@/components/ui/typography';
import { useSession } from '@/lib/auth';
import { inviteDeepLink, inviteUrl } from '@/lib/links';
import { SHADOWS } from '@/theme/tokens';

/**
 * Hàng "mời bạn bè": mã, nút chia sẻ, nút sao chép.
 *
 * Tin nhắn mang **cả** deep link lẫn mã chữ, có chủ đích. Chưa có Universal
 * Link, nên `mido://` chỉ mở được trên máy đã cài app; người chưa cài nhìn thấy
 * một link chết, và mã chữ là đường duy nhất họ vào được nhóm (qua tab "Nhập mã
 * mời"). Bỏ mã đi là bỏ luôn nhóm người đó.
 */
export function InviteShare({ code, groupName }: { code: string; groupName?: string }) {
  const router = useRouter();
  const { isGuest } = useSession();
  const [copied, setCopied] = useState(false);

  const url = inviteUrl(code);

  async function share() {
    const invitation = groupName ? `Vào nhóm "${groupName}" trên Mido nhé.` : 'Vào nhóm Mido nhé.';
    const message = `${invitation}\n\nMở app: ${inviteDeepLink(code)}\nHoặc nhập mã: ${code}`;

    if (Platform.OS === 'web') {
      await Clipboard.setStringAsync(message);
      setCopied(true);
      return;
    }

    await Share.share({ message });
  }

  async function copy() {
    await Clipboard.setStringAsync(code);
    setCopied(true);
  }

  return (
    <View className="gap-2.5">
      <Card className="flex-row items-center justify-between px-4 py-3.5" style={SHADOWS.field}>
        <MonoText className="text-[16px] text-ink">{code}</MonoText>
        <Pressable
          accessibilityRole="button"
          className="active:opacity-60"
          onPress={() => void copy()}
        >
          <Text className="font-body-bold text-[12.5px] text-coral">
            {copied ? 'Đã sao chép' : 'Sao chép mã'}
          </Text>
        </Pressable>
      </Card>

      <Pressable
        accessibilityRole="button"
        className="items-center rounded-full bg-coral-soft py-3 active:opacity-70"
        onPress={() => void share()}
      >
        <Text className="font-heading text-[13.5px] text-coral-dark">
          {Platform.OS === 'web' ? 'Sao chép lời mời' : 'Chia sẻ lời mời'}
        </Text>
      </Pressable>

      <Text className="font-body text-[11.5px] text-ink-40">{url}</Text>

      {/* Khoảnh khắc đáng nhắc nhất: họ sắp kéo bạn bè vào một nhóm mà chính
          họ có thể mất khi đổi máy. Nhắc ở đây, không chặn. */}
      {isGuest ? (
        <Pressable
          accessibilityRole="button"
          className="active:opacity-70"
          onPress={() => router.push('/upgrade')}
        >
          <Text className="font-body text-[12px] leading-[18px] text-ink-55">
            Bạn đang dùng thử. <Text className="font-body-bold text-coral">Lưu tài khoản</Text> để
            không mất nhóm này khi đổi máy.
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
