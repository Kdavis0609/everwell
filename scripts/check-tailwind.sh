#!/usr/bin/env bash
set -euo pipefail
CSS_FILE="$(find .next -type f -name '*.css' | head -n 1 || true)"
if [[ -z "${CSS_FILE}" ]]; then
  echo "❌ No compiled CSS found in .next. Build or dev output missing."
  exit 1
fi
# Look for common Tailwind utility/preflight tokens
if grep -Eq -- "--tw-ring-offset-shadow|--tw-shadow|--tw-translate-x|rounded-[^ {]+" "${CSS_FILE}"; then
  echo "✅ Tailwind utilities detected in compiled CSS (${CSS_FILE})"
  exit 0
else
  echo "❌ Tailwind utilities not detected in compiled CSS (${CSS_FILE})"
  exit 1
fi
