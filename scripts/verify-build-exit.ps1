# scripts/verify-build-exit.ps1
npm run build | Tee-Object -FilePath build.log
$exitCode = $LASTEXITCODE

Write-Host "Build completed with exit code: $exitCode"

if (Select-String -Path build.log -Pattern '::BUILD_SENTINEL::BUILD_OK') {
    Write-Host "✅ Build successful - sentinel found"
    exit 0
} else {
    Write-Host "❌ Build failed - no sentinel found"
    exit 1
}
