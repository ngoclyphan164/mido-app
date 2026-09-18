import { Stack } from 'expo-router';

/**
 * Màn đầu của nhóm phải được chỉ đích danh.
 *
 * Không có `index.tsx` lẫn khai báo này thì expo-router chọn route đầu theo thứ
 * tự file, nên `forgot-password` — thứ tự bảng chữ cái đứng trước `sign-in` —
 * có thể thành màn chào. Giờ đã có `index.tsx`, nhưng vẫn ghi ra cho chắc.
 */
export const unstable_settings = { initialRouteName: 'index' };

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFF8F4' } }} />
  );
}
