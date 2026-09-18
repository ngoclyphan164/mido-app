import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Những lựa chọn nhỏ của người dùng về chính giao diện, không thuộc về API.
 *
 * Phải persist: một lời nhắc đã tắt mà hiện lại sau mỗi lần mở app thì tệ hơn
 * là không có lời nhắc nào.
 */
type AppState = {
  /** Đã tắt thẻ mời lưu tài khoản ở Home. Chỉ có ý nghĩa với phiên khách. */
  guestNudgeDismissed: boolean;
  dismissGuestNudge: () => void;
  /**
   * Đã xác nhận email nhưng chưa đặt mật khẩu.
   *
   * Khoảng giữa này nguy hiểm: Supabase đã chuyển tài khoản khách thành tài
   * khoản thật, nên `is_anonymous` thành false và mọi lời mời nâng cấp biến mất
   * — trong khi người dùng vẫn chưa có mật khẩu nào để đăng nhập lại. Thoát ra
   * lúc này là mất tài khoản.
   *
   * Supabase không phát ra tín hiệu nào cho "user này chưa có mật khẩu", nên
   * phải tự nhớ. Cờ nằm trên máy: xác nhận email ở máy khác rồi quay về đây thì
   * không bắt được — đổi lại, cờ sống sót qua việc tắt hẳn app, thứ hay xảy ra
   * hơn nhiều khi người dùng rời đi mở hộp thư.
   */
  needsPasswordSetup: boolean;
  setNeedsPasswordSetup: (value: boolean) => void;
  /**
   * Xoá mọi thứ gắn với một người dùng cụ thể, khi phiên đổi sang người khác.
   *
   * Cả hai cờ trên đều được persist, nên nếu không dọn thì người đăng nhập sau
   * thừa hưởng lựa chọn của người trước: thẻ nhắc đã bị tắt nên không hiện lại,
   * hoặc tệ hơn, banner "chưa đặt mật khẩu" của người khác đuổi theo họ.
   */
  resetForNewUser: () => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      guestNudgeDismissed: false,
      dismissGuestNudge: () => set({ guestNudgeDismissed: true }),
      needsPasswordSetup: false,
      setNeedsPasswordSetup: (needsPasswordSetup) => set({ needsPasswordSetup }),
      resetForNewUser: () => set({ guestNudgeDismissed: false, needsPasswordSetup: false }),
    }),
    {
      name: 'mido.app-prefs',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
