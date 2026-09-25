$ErrorActionPreference = "Stop"

Write-Host "=== Auction XI V4.8 Verification ===" -ForegroundColor Cyan

Write-Host "`n[1/7] Checking V4.7 baseline..."
foreach ($path in @(
  ".\frontend\src\components\auctionxi25d\dream\fielding\FieldingDirector.ts",
  ".\frontend\src\components\auctionxi25d\dream\ball\trajectory.ts",
  ".\frontend\src\components\auctionxi25d\dream\ball\director.ts"
)) {
  if (-not (Test-Path $path)) { throw "Missing V4.7/V4.6 baseline file: $path" }
}
Write-Host "PASS"

Write-Host "`n[2/7] Checking cinematic camera runtime..."
$camera = Get-Content ".\frontend\src\components\auctionxi25d\dream\camera\director.ts" -Raw
$cinematic = Get-Content ".\frontend\src\components\auctionxi25d\dream\camera\cinematic.ts" -Raw
foreach ($needle in @(
  "setManual",
  "beginBall",
  "CinematicCue",
  "buildCinematicPlan",
  "focusPointFor",
  "BOUNDARY_VIEW",
  "WICKET_VIEW",
  "CELEBRATION_VIEW"
)) {
  if ($camera -notmatch [regex]::Escape($needle) -and $cinematic -notmatch [regex]::Escape($needle)) {
    throw "Missing V4.8 camera marker: $needle"
  }
}
Write-Host "PASS"

Write-Host "`n[3/7] Checking presentation runtime integration..."
$director = Get-Content ".\frontend\src\components\auctionxi25d\dream\presentation\director.ts" -Raw
foreach ($needle in @(
  "this.camera.beginBall",
  "this.ball.getPosition()",
  "this.fielding.getTarget()",
  "points:"
)) {
  if ($director -notmatch [regex]::Escape($needle)) { throw "V4.8 presentation integration missing: $needle" }
}
Write-Host "PASS"

Write-Host "`n[4/7] Checking ball position binding..."
$ball = Get-Content ".\frontend\src\components\auctionxi25d\dream\ball\director.ts" -Raw
foreach ($needle in @("getPosition(): THREE.Vector3", "getTrajectory()", "getTimings()")) {
  if ($ball -notmatch [regex]::Escape($needle)) { throw "Ball camera binding missing: $needle" }
}
Write-Host "PASS"

Write-Host "`n[5/7] Checking manual camera override..."
$stage = Get-Content ".\frontend\src\components\auctionxi25d\MiniMatch25DStage.tsx" -Raw
if ($stage -notmatch [regex]::Escape("setManual")) { throw "MiniMatch25DStage.tsx is not using the V4.8 manual override." }
Write-Host "PASS"

Write-Host "`n[6/7] Frontend production build..."
npm run build:frontend
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed." }
Write-Host "PASS"

Write-Host "`n[7/7] Backend test suite..."
npm run test:backend
if ($LASTEXITCODE -ne 0) { throw "Backend tests failed." }
Write-Host "PASS"

Write-Host "`nV4.8 verification complete." -ForegroundColor Green
