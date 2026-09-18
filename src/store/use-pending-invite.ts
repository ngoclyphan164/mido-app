import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Mã mời đang chờ được dùng, giữ qua vòng đăng nhập.
 *
 * Phải persist chứ không để trong bộ nhớ: một người chưa có tài khoản bấm link
 * sẽ đi qua đăng ký và xác nhận email, tức là rời app rồi quay lại — có khi sau
 * cả một lần khởi động lại. Giữ trong RAM thì lời mời bốc hơi đúng lúc họ vừa
 * làm xong phần việc khó nhất.
 *
 * `(app)/_layout.tsx` là nơi tiêu thụ mã này: khi guard lật signed-out →
 * signed-in, màn `join` cũ đã bị xoá khỏi history, nên lúc `(app)` mount là
 * điểm hẹn duy nhất đáng tin.
 */
type PendingInviteState = {
  code: string | null;
  setCode: (code: string) => void;
  clear: () => void;
};

export const usePendingInvite = create<PendingInviteState>()(
  persist(
    (set) => ({
      code: null,
      setCode: (code) => set({ code }),
      clear: () => set({ code: null }),
    }),
    {
      name: 'mido.pending-invite',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
