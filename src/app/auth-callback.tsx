import { Redirect } from 'expo-router';

/**
 * Điểm rơi của redirect OAuth — gần như không bao giờ hiện ra.
 *
 * `WebBrowser.openAuthSessionAsync` chặn URL redirect và trao thẳng cho hàm gọi
 * nó (xem `src/lib/oauth.ts`), nên luồng bình thường không đi qua đây. Màn này
 * tồn tại cho trường hợp Custom Tab trên Android thả deep link vào app thay vì
 * đóng sheet: thiếu nó thì router báo 404 trên một đường dẫn người dùng không
 * bao giờ tự gõ.
 *
 * Không tự đọc token: phiên lúc này hoặc đã được nạp xong, hoặc lần thử đó đã
 * hỏng — cả hai đều được `_layout.tsx` xử lý đúng khi đưa về gốc.
 */
export default function AuthCallback() {
  return <Redirect href="/" />;
}
