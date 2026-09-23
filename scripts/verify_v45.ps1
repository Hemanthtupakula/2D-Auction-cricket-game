$ErrorActionPreference = "Stop"

Write-Host "=== Auction XI V4.5 Verification ===" -ForegroundColor Cyan

Write-Host "`n[1/4] Checking phase helper..."
if (-not (Test-Path ".\frontend\src\components\auctionxi25d\livePresentation\buildPresentationFeed.ts")) {
    throw "V4.5 helper file not found."
}
Write-Host "PASS"

Write-Host "`n[2/4] Checking arena binding..."
$arena = Get-Content ".\frontend\src\components\MiniMatch2DArena.tsx" -Raw
foreach ($needle in @(
    "buildPresentationFeed",
    "presentationFeed.balls",
    "presentationFeed.lastBall",
    "presentationFeed.players"
)) {
    if ($arena -notmatch [regex]::Escape($needle)) {
        throw "Missing V4.5 binding: $needle"
    }
}
Write-Host "PASS"

Write-Host "`n[3/4] Frontend build..."
npm run build:frontend
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed." }
Write-Host "PASS"

Write-Host "`n[4/4] Backend tests..."
npm run test:backend
if ($LASTEXITCODE -ne 0) { throw "Backend tests failed." }
Write-Host "PASS"

Write-Host "`nV4.5 verification complete." -ForegroundColor Green
