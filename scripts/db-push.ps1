$ErrorActionPreference = "Stop"
Write-Host "Checking Supabase CLI via npx..."
npx supabase -v
# Try to derive ref from NEXT_PUBLIC_SUPABASE_URL if not explicitly set
$envFile = ".env.local"
$ref = $env:SUPABASE_PROJECT_REF
if (-not $ref -and (Test-Path $envFile)) {
  $url = (Get-Content $envFile | Select-String -Pattern "^NEXT_PUBLIC_SUPABASE_URL=").ToString().Split("=")[1]
  if ($url) {
    # URL like https://<ref>.supabase.co
    $hostname = ([Uri]$url).Host
    if ($hostname -match "^([^.]+)\.") { $ref = $Matches[1] }
  }
}
if (-not $ref) {
  Write-Host "Could not infer project ref. Set SUPABASE_PROJECT_REF or update .env.local with NEXT_PUBLIC_SUPABASE_URL"
  exit 1
}
Write-Host "Project ref: $ref"
# Link (idempotent)
npx supabase link --project-ref $ref
# Push migrations
npx supabase db push
Write-Host "✅ Supabase migrations pushed."
