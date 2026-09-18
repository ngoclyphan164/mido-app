#!/usr/bin/env node
/**
 * Sinh client secret JWT cho Sign in with Apple, từ file .p8 tải ở Apple Developer.
 *
 * Supabase KHÔNG nhận nội dung file .p8. Ô "Secret Key (for OAuth)" cần một JWT
 * ký bằng file đó, và Apple bắt JWT này hết hạn tối đa sau 6 tháng — hết hạn thì
 * đăng nhập Apple ngừng chạy mà app không báo lỗi nào, sheet trình duyệt chỉ
 * quay về tay không. Vì vậy chỗ này là một script trong repo, không phải một
 * trang web dùng một lần: 6 tháng nữa sẽ phải chạy lại.
 *
 * Không cần cài gì thêm — Node tự ký được ES256.
 *
 *   node scripts/apple-client-secret.mjs \
 *     --key .apple-credentials/AuthKey_XXXXXXXXXX.p8 \
 *     --key-id XXXXXXXXXX \
 *     --team-id YYYYYYYYYY \
 *     --services-id com.linhtuti.mido.app.signin
 */
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

/** Trần cứng của Apple: 6 tháng. Xin dài hơn thì token bị từ chối thẳng. */
const MAX_LIFETIME_SECONDS = 15_777_000;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const eq = token.indexOf('=');
    if (eq === -1) {
      args[token.slice(2)] = argv[i + 1];
      i += 1;
    } else {
      args[token.slice(2, eq)] = token.slice(eq + 1);
    }
  }
  return args;
}

/** base64url, không padding — đúng dạng JWS yêu cầu. */
function encode(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(JSON.stringify(input), 'utf8');
  return buffer.toString('base64url');
}

const args = parseArgs(process.argv.slice(2));
const missing = ['key', 'key-id', 'team-id', 'services-id'].filter((name) => !args[name]);

if (missing.length > 0) {
  console.error(`Thiếu tham số: ${missing.map((name) => `--${name}`).join(', ')}\n`);
  console.error('Ví dụ:');
  console.error('  node scripts/apple-client-secret.mjs \\');
  console.error('    --key .apple-credentials/AuthKey_XXXXXXXXXX.p8 \\');
  console.error('    --key-id XXXXXXXXXX \\');
  console.error('    --team-id YYYYYYYYYY \\');
  console.error('    --services-id com.linhtuti.mido.app.signin');
  process.exit(1);
}

const privateKey = readFileSync(args.key, 'utf8');

if (!privateKey.includes('BEGIN PRIVATE KEY')) {
  console.error(`${args.key} không phải khoá PKCS#8. Tải lại file .p8 từ Apple Developer.`);
  process.exit(1);
}

const issuedAt = Math.floor(Date.now() / 1000);
const expiresAt = issuedAt + MAX_LIFETIME_SECONDS;

// `kid` là Key ID của khoá Sign in with Apple, KHÔNG phải của khoá App Store
// Connect — hai file .p8 trông giống hệt nhau và đây là chỗ hay lẫn nhất.
const header = { alg: 'ES256', kid: args['key-id'] };
const payload = {
  iss: args['team-id'],
  iat: issuedAt,
  exp: expiresAt,
  aud: 'https://appleid.apple.com',
  // `sub` là Services ID (client_id của luồng web), không phải bundle id.
  sub: args['services-id'],
};

const signingInput = `${encode(header)}.${encode(payload)}`;

// ES256 trong JWS là r||s thô, còn `createSign` mặc định trả chữ ký DER. Thiếu
// `dsaEncoding` thì Apple trả invalid_client mà không nói vì sao.
const signature = createSign('SHA256')
  .update(signingInput)
  .sign({ key: privateKey, dsaEncoding: 'ieee-p1363' });

process.stdout.write(`${signingInput}.${encode(signature)}\n`);

console.error('');
console.error(`Hết hạn: ${new Date(expiresAt * 1000).toISOString().slice(0, 10)}`);
console.error('Dán vào Supabase > Authentication > Providers > Apple > Secret Key (for OAuth).');
console.error('Ghi ngày hết hạn vào .apple-credentials/README.txt rồi đặt nhắc trước một tuần.');
