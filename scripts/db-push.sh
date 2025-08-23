#!/usr/bin/env bash
set -euo pipefail
echo "Checking Supabase CLI via npx..."
npx supabase -v
REF="${SUPABASE_PROJECT_REF:-}"
if [ -z "${REF}" ] && [ -f ".env.local" ]; then
  URL="$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2- || true)"
  if [ -n "$URL" ]; then
    HOST="$(node -e "console.log(new URL('$URL').host)")"
    REF="${HOST%%.*}"
  fi
fi
if [ -z "${REF}" ]; then
  echo "Could not infer project ref. Set SUPABASE_PROJECT_REF or add NEXT_PUBLIC_SUPABASE_URL to .env.local"
  exit 1
fi
echo "Project ref: $REF"
npx supabase link --project-ref "$REF"
npx supabase db push
echo "✅ Supabase migrations pushed."
