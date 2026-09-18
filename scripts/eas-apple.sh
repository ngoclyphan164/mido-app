#!/usr/bin/env bash
#
# Chạy một lệnh EAS bất kỳ với thông tin App Store Connect API key đã nạp sẵn.
#
# Lý do tồn tại: Apple ID của dự án này không đăng nhập trên thiết bị nào, mà 2FA
# qua SMS thì hỏng phía Apple. ASC API key không có 2FA, và eas-cli dùng được nó
# để ký build — `SetUpProvisioningProfile.js` gọi
# `tryAuthenticateAppStoreWithEasAscApiKeyAsync` khi ba biến EXPO_ASC_* có mặt.
#
# Lưu ý: `eas device:create` KHÔNG dùng đường này. `devices/manager.js` gọi
# `ensureAuthenticatedAsync()` vô điều kiện, nên đăng ký UDID luôn cần đăng nhập
# Apple ID. Đó chính là lý do nên phân phối qua TestFlight thay vì ad hoc.
#
#   ./scripts/eas-apple.sh build --platform ios --profile testflight
#   ./scripts/eas-apple.sh submit --platform ios --latest --profile production

set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
config_file="${APPLE_EAS_ENV_FILE:-${project_dir}/.apple-credentials/credentials.env}"

if [[ ! -f "${config_file}" ]]; then
  echo "Missing ${config_file}. See .apple-credentials/README.txt." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${config_file}"
set +a

for variable_name in EXPO_ASC_API_KEY_PATH EXPO_ASC_KEY_ID EXPO_ASC_ISSUER_ID EXPO_APPLE_TEAM_ID; do
  if [[ -z "${!variable_name:-}" ]]; then
    echo "Missing ${variable_name} in ${config_file}." >&2
    exit 1
  fi
done

# eas-cli mở khoá bằng đường dẫn tuyệt đối; đường dẫn tương đối trong file env là
# tính từ gốc dự án chứ không phải thư mục người dùng đang đứng.
if [[ "${EXPO_ASC_API_KEY_PATH}" != /* ]]; then
  EXPO_ASC_API_KEY_PATH="${project_dir}/${EXPO_ASC_API_KEY_PATH#./}"
  export EXPO_ASC_API_KEY_PATH
fi

if [[ ! -f "${EXPO_ASC_API_KEY_PATH}" ]]; then
  echo "App Store Connect API key not found at ${EXPO_ASC_API_KEY_PATH}." >&2
  exit 1
fi

cd "${project_dir}"
exec eas "$@"
