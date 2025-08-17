# PowerShell script to check if Tailwind utilities are present in compiled CSS
$ErrorActionPreference = "Stop"

# Find the first CSS file in .next directory
$CSS_FILE = Get-ChildItem -Path ".next" -Recurse -Filter "*.css" | Select-Object -First 1 -ExpandProperty FullName

if (-not $CSS_FILE) {
    Write-Host "❌ No compiled CSS found in .next. Build or dev output missing."
    exit 1
}

# Look for common Tailwind utility/preflight tokens
$content = Get-Content $CSS_FILE -Raw
if ($content -match "--tw-ring-offset-shadow|--tw-shadow|--tw-translate-x|rounded-[^ {]+") {
    Write-Host "✅ Tailwind utilities detected in compiled CSS ($CSS_FILE)"
    exit 0
} else {
    Write-Host "❌ Tailwind utilities not detected in compiled CSS ($CSS_FILE)"
    exit 1
}
