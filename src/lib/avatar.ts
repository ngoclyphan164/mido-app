import { getSupabase } from '@/lib/supabase';

/** Bucket public do migration 0012 tạo. Policy chỉ cho ghi vào thư mục mang user id. */
export const AVATAR_BUCKET = 'avatars';

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Đẩy ảnh thẳng lên Supabase Storage bằng phiên của chính người dùng, rồi trả về
 * URL public để client PATCH vào hồ sơ.
 *
 * Không đi qua API: ký signed upload URL sẽ đưa service-role key lên đường đi của
 * người dùng, còn proxy bytes qua Nest thì đụng giới hạn body của Vercel và gấp
 * đôi băng thông. Storage RLS đã giới hạn đúng thư mục của họ, và
 * `PATCH /v1/profiles/me` kiểm tra lại tiền tố URL một lần nữa.
 */
export async function uploadAvatar(
  userId: string,
  asset: { uri: string; mimeType?: string },
  previousUrl?: string | null,
): Promise<string> {
  const client = getSupabase();
  if (!client) throw new Error('Chưa cấu hình Supabase.');

  const mimeType = normalizeMime(asset.mimeType);
  const extension = EXTENSION_BY_MIME[mimeType] ?? 'jpg';
  // Tên có mốc thời gian để CDN không trả lại ảnh cũ sau khi đổi.
  const path = `${userId}/avatar-${Date.now()}.${extension}`;

  // `blob()` trên Hermes không ổn định với `file://`; `arrayBuffer()` thì có, và
  // supabase-js nhận thẳng ArrayBuffer.
  const response = await fetch(asset.uri);
  if (!response.ok) throw new Error('Không đọc được ảnh đã chọn.');
  const bytes = await response.arrayBuffer();

  const { error } = await client.storage
    .from(AVATAR_BUCKET)
    .upload(path, bytes, { contentType: mimeType, upsert: true });
  if (error) throw error;

  // Dọn ảnh cũ sau khi ảnh mới đã lên: hỏng bước này chỉ để lại một file mồ côi,
  // không được làm hỏng cả lần đổi ảnh.
  const previousPath = pathInsideOwnFolder(previousUrl, userId);
  if (previousPath) {
    void client.storage
      .from(AVATAR_BUCKET)
      .remove([previousPath])
      .catch(() => undefined);
  }

  return client.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
}

function normalizeMime(mimeType?: string): string {
  return mimeType && mimeType in EXTENSION_BY_MIME ? mimeType : 'image/jpeg';
}

/** `…/object/public/avatars/<userId>/<file>` → `<userId>/<file>`, và chỉ khi đúng chủ. */
function pathInsideOwnFolder(url: string | null | undefined, userId: string): string | null {
  if (!url) return null;
  const marker = `/${AVATAR_BUCKET}/${userId}/`;
  const at = url.indexOf(marker);
  if (at === -1) return null;

  const file = url.slice(at + marker.length).split('?')[0];
  return file ? `${userId}/${file}` : null;
}
