import { Stack, usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { usePendingInvite } from '@/store/use-pending-invite';

/**
 * Chỗ khép vòng của luồng mời.
 *
 * Khi guard ở root lật signed-out → signed-in, expo-router gỡ nhánh cũ khỏi
 * history, nên màn `join/[code]` mà người dùng vừa đứng trên đó biến mất cùng
 * lúc phiên sẵn sàng. `(app)` mount là điểm hẹn duy nhất chắc chắn xảy ra sau
 * khi đăng nhập xong, dù họ đi qua đăng ký, xác nhận email hay khởi động lại app.
 */
function PendingInviteRedeemer() {
  const router = useRouter();
  const pathname = usePathname();
  const code = usePendingInvite((state) => state.code);

  // Latch: `join/[code]` tự xoá mã khi bắt đầu vào nhóm, nhưng lần replace phải
  // xảy ra đúng một lần dù component render lại bao nhiêu lần.
  const redeemed = useRef(false);

  useEffect(() => {
    if (redeemed.current || !code) return;

    /*
      Đang đứng sẵn trên màn đó thì đừng replace.

      Từ khi link mời tự dựng phiên khách ngay tại `join/[code]`, màn ấy không
      còn bị gỡ xuống lúc phiên xuất hiện nữa — nó nằm ngoài cả hai guard. `(app)`
      mount ở đúng commit đó và, nếu không có điều kiện này, sẽ replace về chính
      route đang hiện: màn remount, latch bên kia reset, và request vào nhóm chạy
      hai lần.
    */
    if (pathname === `/join/${code}`) return;

    redeemed.current = true;
    router.replace(`/join/${code}`);
  }, [code, pathname, router]);

  return null;
}

export default function AppLayout() {
  return (
    <>
      <PendingInviteRedeemer />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFF8F4' } }} />
    </>
  );
}
