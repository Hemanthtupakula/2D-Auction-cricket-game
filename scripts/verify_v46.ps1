$ErrorActionPreference = "Stop"

Write-Host "=== Auction XI V4.6 Verification ===" -ForegroundColor Cyan

Write-Host "`n[1/5] Checking V4.5 binding..."
$arenaPath = ".\frontend\src\components\MiniMatch2DArena.tsx"
if (-not (Test-Path $arenaPath)) { throw "MiniMatch2DArena.tsx not found." }
$arena = Get-Content $arenaPath -Raw
foreach ($needle in @(
    "buildPresentationFeed",
    "presentationFeed.balls",
    "presentationFeed.lastBall",
    "presentationFeed.players"
)) {
    if ($arena -notmatch [regex]::Escape($needle)) { throw "V4.5 binding missing: $needle" }
}
Write-Host "PASS"

Write-Host "`n[2/5] Checking V4.6 trajectory runtime..."
$trajectory = ".\frontend\src\components\auctionxi25d\dream\ball\trajectory.ts"
$ballDirector = ".\frontend\src\components\auctionxi25d\dream\ball\director.ts"
foreach ($path in @($trajectory, $ballDirector)) {
    if (-not (Test-Path $path)) { throw "Missing V4.6 runtime file: $path" }
}
$trajectoryText = Get-Content $trajectory -Raw
$directorText = Get-Content $ballDirector -Raw
foreach ($needle in @("resolveBallTrajectory", "bounceTime", "contactTime", "totalDuration")) {
    if ($trajectoryText -notmatch [regex]::Escape($needle) -and $directorText -notmatch [regex]::Escape($needle)) {
        throw "Missing V4.6 physics contract: $needle"
    }
}
Write-Host "PASS"

Write-Host "`n[3/5] Checking presentation contract..."
$stage = Get-Content ".\frontend\src\components\auctionxi25d\MiniMatch25DStage.tsx" -Raw
foreach ($needle in @("batterId", "bowlerId", "timingBand", "wicketType", "playBall")) {
    if ($stage -notmatch [regex]::Escape($needle)) { throw "Missing V4.6 stage binding: $needle" }
}
Write-Host "PASS"

Write-Host "`n[4/5] Frontend build..."
npm run build:frontend
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed." }
Write-Host "PASS"

Write-Host "`n[5/5] Backend tests..."
npm run test:backend
if ($LASTEXITCODE -ne 0) { throw "Backend tests failed." }
Write-Host "PASS"

Write-Host "`nV4.6 verification complete." -ForegroundColor Green
