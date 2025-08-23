$ErrorActionPreference = "SilentlyContinue"
$ports = @(3000,3001)
foreach ($p in $ports) {
  $conns = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
  if ($conns) {
    $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $pids) { Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue; Write-Host "Killed PID $processId on port $p" }
  } else { Write-Host "No listener on port $p" }
}
Write-Host "Starting dev server on port 3000..."
npm run dev
