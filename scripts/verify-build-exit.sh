#!/bin/bash
# scripts/verify-build-exit.sh

npm run build | tee build.log
exitCode=$?

echo "Build completed with exit code: $exitCode"

if grep -q "::BUILD_SENTINEL::BUILD_OK" build.log; then
    echo "✅ Build successful - sentinel found"
    exit 0
else
    echo "❌ Build failed - no sentinel found"
    exit 1
fi
