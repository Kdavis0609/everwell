#!/usr/bin/env bash
set -e
for p in 3000 3001; do
  pid=$(lsof -ti tcp:$p || true)
  if [ -n "$pid" ]; then
    echo "Killing PID $pid on port $p"
    kill -9 "$pid" || true
  else
    echo "No listener on port $p"
  fi
done
echo "Starting dev server on port 3000..."
npm run dev
