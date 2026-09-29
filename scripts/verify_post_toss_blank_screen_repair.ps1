$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$match = Get-Content "frontend/src/components/MatchScreen.tsx" -Raw
$app   = Get-Content "frontend/src/App.tsx" -Raw

Write-Host "[1/5] Safe XI normalization..."
if ($match -notmatch "safeHomeXi") { throw "safeHomeXi missing" }
if ($match -notmatch "const battingXi") { throw "battingXi missing" }
if ($match -notmatch "const bowlingXi") { throw "bowlingXi missing" }
Write-Host "PASS"

Write-Host "[2/5] Post-toss refresh guard..."
if ($match -notmatch "POST_TOSS_REFRESH_INTERVAL") { throw "post-toss polling missing" }
Write-Host "PASS"

Write-Host "[3/5] Error boundary..."
if ($app -notmatch "MatchScreenErrorBoundary") { throw "MatchScreenErrorBoundary missing" }
Write-Host "PASS"

Write-Host "[4/5] Visible Suspense fallback..."
if ($app -notmatch "LOADING MATCH ENGINE") { throw "visible match loading fallback missing" }
Write-Host "PASS"

Write-Host "[5/5] Frontend build..."
npm run build:frontend
Write-Host "PASS - post-toss repair verification complete."
