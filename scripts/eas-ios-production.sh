#!/usr/bin/env bash

set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
config_file="${APPLE_EAS_ENV_FILE:-${project_dir}/.apple-credentials/credentials.env}"

if [[ ! -f "${config_file}" ]]; then
  echo "Missing ${config_file}. Copy .env.apple.example to .apple-credentials/credentials.env and fill in the Apple values." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${config_file}"
set +a

required_variables=(
  EXPO_ASC_API_KEY_PATH
  EXPO_ASC_KEY_ID
  EXPO_ASC_ISSUER_ID
  EXPO_APPLE_TEAM_ID
  EXPO_APPLE_TEAM_TYPE
)

for variable_name in "${required_variables[@]}"; do
  if [[ -z "${!variable_name:-}" ]]; then
    echo "Missing ${variable_name} in ${config_file}." >&2
    exit 1
  fi
done

if [[ "${EXPO_APPLE_TEAM_TYPE}" != "INDIVIDUAL" ]]; then
  echo "EXPO_APPLE_TEAM_TYPE must be INDIVIDUAL for this Apple Developer membership." >&2
  exit 1
fi

if [[ "${EXPO_ASC_API_KEY_PATH}" != /* ]]; then
  EXPO_ASC_API_KEY_PATH="${project_dir}/${EXPO_ASC_API_KEY_PATH#./}"
  export EXPO_ASC_API_KEY_PATH
fi

if [[ ! -f "${EXPO_ASC_API_KEY_PATH}" ]]; then
  echo "App Store Connect API key not found at ${EXPO_ASC_API_KEY_PATH}." >&2
  exit 1
fi

cd "${project_dir}"
exec eas build --platform ios --profile production "$@"
