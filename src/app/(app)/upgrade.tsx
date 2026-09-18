import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { AuthDivider, SocialAuthButtons } from '@/components/social-auth';
import { OutlineButton, PrimaryButton } from '@/components/ui/buttons';
import { LabeledInput } from '@/components/ui/form';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { Card } from '@/components/ui/typography';
import { useUpdateProfile } from '@/lib/api/queries';
import { useSession } from '@/lib/auth';
import { useAppStore } from '@/store/use-app-store';
import { SHADOWS } from '@/theme/tokens';

/**
 * Biến một phiên khách thành tài khoản thật, giữ nguyên toàn bộ dữ liệu.
 *
 * Màn này nằm trong `(app)` chứ không phải `(auth)`: khách đã ở trong cây đó
 * rồi, và lúc nâng cấp xong `status` chỉ đi từ 'guest' sang 'signed-in' — cùng
 * một guard — nên không có cú tháo cây nào giữa chừng.
 *
 * Hai bước, vì Supabase bắt buộc thế: `updateUser({ email })` gửi link xác nhận
 * tới địa chỉ mới, và chỉ sau khi link đó chạy mới đặt được mật khẩu. Bước 2
 * nhận ra mình qua `isGuest === false` — đúng trạng thái sau khi email xác nhận
 * xong — nên nó vẫn đúng kể cả khi app bị tắt hẳn giữa hai bước.
 */
export default function Upgrade() {
  const router = useRouter();
  const { isGuest, displayName, startEmailUpgrade, finishEmailUpgrade, syncDisplayName } =
    useSession();
  const updateProfile = useUpdateProfile();

  const needsPassword = useAppStore((state) => state.needsPasswordSetup);
  const setNeedsPassword = useAppStore((state) => state.setNeedsPasswordSetup);

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [linked, setLinked] = useState(false);

  const [name, setName] = useState(() => (displayName === 'Khách' ? '' : displayName));
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function sendLink() {
    setPending(true);
    setError(null);
    try {
      await startEmailUpgrade(email);
      setSent(true);
    } catch (caught) {
      setError(caught);
    } finally {
      setPending(false);
    }
  }

  async function finish() {
    setPending(true);
    setError(null);
    try {
      await finishEmailUpgrade({ password, displayName: name });
      setNeedsPassword(false);
      // Bảng `profiles` là nguồn chuẩn của tên hiển thị, và trigger bên API chỉ
      // chạy AFTER INSERT — nên hồ sơ vẫn đang mang tên "Khách" cho tới khi
      // PATCH này chạy. Cặp updateProfile + syncDisplayName lấy nguyên từ
      // màn hồ sơ.
      const trimmed = name.trim();
      if (trimmed) {
        updateProfile.mutate(
          { displayName: trimmed },
          { onSuccess: () => void syncDisplayName(trimmed) },
        );
      }
      router.replace('/');
    } catch (caught) {
      setError(caught);
    } finally {
      setPending(false);
    }
  }

  // ── Liên kết Google/Apple xong: không cần mật khẩu, tên lấy từ nhà cung cấp ─
  if (linked) {
    return (
      <Screen>
        <ScreenHeader back={false} title="Đã lưu tài khoản" />
        <View className="flex-1 px-5 pt-6">
          <Card className="gap-1.5 p-4" style={SHADOWS.card}>
            <Text className="font-body-bold text-[14px] text-ink">
              {displayName === 'Bạn' ? 'Xong rồi' : `Chào ${displayName}`}
            </Text>
            <Text className="font-body text-[13px] leading-[20px] text-ink-55">
              Nhóm và kèo của bạn được giữ nguyên. Lần sau đăng nhập bằng tài khoản vừa liên kết là
              thấy lại tất cả.
            </Text>
          </Card>
          <Text className="px-1 pt-4 font-body text-[12.5px] leading-[19px] text-ink-45">
            Tên hiển thị lấy từ tài khoản bạn vừa liên kết. Đổi được trong Hồ sơ bất cứ lúc nào.
          </Text>
        </View>
        <View className="gap-2.5 px-5 pb-8 pt-5">
          <PrimaryButton label="Về trang chủ" onPress={() => router.replace('/')} />
          <OutlineButton
            label="Đổi tên hiển thị"
            onPress={() => router.replace('/profile')}
            tone="neutral"
          />
        </View>
      </Screen>
    );
  }

  /*
    Bước 2 bám vào cờ `needsPasswordSetup`, KHÔNG phải `!isGuest`.

    Hai trạng thái rất khác nhau cùng thoả `!isGuest`: vừa xác nhận email mà
    chưa có mật khẩu, và đã liên kết Google nên không cần mật khẩu nào cả. Lấy
    `isGuest` làm mốc thì người liên kết Google bị hỏi mật khẩu vô cớ, còn người
    đi đường email mà thoát ra giữa chừng thì không còn lối nào quay lại.
  */
  if (needsPassword) {
    const canFinish = password.length >= 6 && password === confirmation && !pending;

    return (
      <Screen>
        <ScreenHeader
          onBack={() => router.back()}
          subtitle="Đặt mật khẩu để lần sau đăng nhập lại được"
          title="Gần xong rồi"
        />

        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          <View className="gap-3.5 px-5 pt-6">
            <LabeledInput
              autoCapitalize="words"
              label="Tên hiển thị"
              onChangeText={setName}
              placeholder="Tên bạn muốn nhóm thấy"
              value={name}
            />
            <LabeledInput
              autoCapitalize="none"
              autoComplete="new-password"
              label="Mật khẩu"
              onChangeText={setPassword}
              placeholder="Ít nhất 6 ký tự"
              secureTextEntry
              value={password}
            />
            <LabeledInput
              autoCapitalize="none"
              autoComplete="new-password"
              label="Nhập lại mật khẩu"
              onChangeText={setConfirmation}
              placeholder="••••••••"
              secureTextEntry
              value={confirmation}
            />
            {confirmation.length > 0 && password !== confirmation ? (
              <Text className="font-body text-[12.5px] text-coral-dark">
                Hai mật khẩu chưa khớp nhau.
              </Text>
            ) : null}
          </View>

          {error ? <ErrorState error={error} title="Chưa lưu được" /> : null}
        </ScrollView>

        <View className="px-5 pb-8 pt-5">
          <PrimaryButton
            disabled={!canFinish}
            label={pending ? 'Đang lưu…' : 'Hoàn tất'}
            onPress={() => void finish()}
          />
        </View>
      </Screen>
    );
  }

  // ── Đã gửi link, chờ họ mở hộp thư ────────────────────────────────────────
  if (sent) {
    return (
      <Screen>
        <ScreenHeader onBack={() => setSent(false)} title="Lưu tài khoản" />
        <EmptyState
          hint={`Mido đã gửi link xác nhận tới ${email.trim()}. Mở link đó rồi quay lại đây để đặt mật khẩu.`}
          title="Kiểm tra email của bạn"
        />
        <View className="px-5 pb-8 pt-2">
          <PrimaryButton label="Về trang chủ" onPress={() => router.replace('/')} />
        </View>
      </Screen>
    );
  }

  // ── Không còn gì để nâng cấp ──────────────────────────────────────────────
  // Tới được đây nghĩa là tài khoản đã đầy đủ: không phải khách, không thiếu
  // mật khẩu. Hiện form "giữ lại dữ liệu" lúc này chỉ làm người dùng bối rối.
  if (!isGuest) {
    return (
      <Screen>
        <ScreenHeader onBack={() => router.back()} title="Tài khoản" />
        <View className="flex-1 px-5 pt-6">
          <Card className="gap-1.5 p-4" style={SHADOWS.card}>
            <Text className="font-body-bold text-[14px] text-ink">Tài khoản đã được lưu</Text>
            <Text className="font-body text-[13px] leading-[20px] text-ink-55">
              Đăng nhập ở máy nào cũng thấy lại nhóm và kèo của bạn.
            </Text>
          </Card>
        </View>
        <View className="px-5 pb-8 pt-5">
          <PrimaryButton label="Về trang chủ" onPress={() => router.replace('/')} />
        </View>
      </Screen>
    );
  }

  // ── Bước 1 ────────────────────────────────────────────────────────────────
  const canSend = email.trim().length > 3 && !pending;

  return (
    <Screen>
      <ScreenHeader
        onBack={() => router.back()}
        subtitle="Nhóm, kèo và lịch sử của bạn được giữ nguyên"
        title="Giữ lại dữ liệu của bạn"
      />

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="px-5 pt-5">
          <Card className="gap-1 p-4" style={SHADOWS.card}>
            <Text className="font-body-bold text-[13.5px] text-ink">
              Bạn đang dùng thử trên máy này
            </Text>
            <Text className="font-body text-[12.5px] leading-[19px] text-ink-55">
              Nếu gỡ app hoặc đổi điện thoại, mọi thứ bạn đã tạo sẽ mất. Lưu tài khoản rồi thì đăng
              nhập ở đâu cũng thấy lại.
            </Text>
          </Card>
        </View>

        <View className="gap-4 px-5 pt-6">
          {/* Cùng một component với màn đăng nhập, nhưng ở đây `isGuest` là true
              nên nó đi nhánh `linkIdentity` — giữ nguyên user id. */}
          <SocialAuthButtons onDone={() => setLinked(true)} />
          <AuthDivider />
        </View>

        <View className="gap-3.5 px-5 pt-5">
          <LabeledInput
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            inputMode="email"
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            placeholder="ban@email.com"
            value={email}
          />
          <Text className="font-body text-[12.5px] leading-[19px] text-ink-45">
            Mido gửi một link xác nhận tới địa chỉ này. Mật khẩu đặt ở bước sau.
          </Text>
        </View>

        {error ? <ErrorState error={error} title="Chưa gửi được link" /> : null}
      </ScrollView>

      <View className="px-5 pb-8 pt-5">
        <PrimaryButton
          disabled={!canSend}
          label={pending ? 'Đang gửi…' : 'Gửi link xác nhận'}
          onPress={() => void sendLink()}
        />
      </View>
    </Screen>
  );
}
