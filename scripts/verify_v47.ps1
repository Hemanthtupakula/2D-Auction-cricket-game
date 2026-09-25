$ErrorActionPreference = "Stop"

Write-Host "=== Auction XI V4.7 Verification ===" -ForegroundColor Cyan

Write-Host "`n[1/6] Checking V4.6 baseline..."
$trajectory = ".\frontend\src\components\auctionxi25d\dream\ball\trajectory.ts"
$ballDirector = ".\frontend\src\components\auctionxi25d\dream\ball\director.ts"
if (-not (Test-Path $trajectory)) { throw "V4.6 trajectory.ts not found." }
if (-not (Test-Path $ballDirector)) { throw "V4.6 ball/director.ts not found." }
$ballText = Get-Content $ballDirector -Raw
foreach ($needle in @("resolveBallTrajectory", "getTrajectory", "getTimings")) {
    if ($ballText -notmatch [regex]::Escape($needle)) { throw "V4.6 ball runtime marker missing: $needle" }
}
Write-Host "PASS"

Write-Host "`n[2/6] Checking V4.7 fielding runtime..."
$fielding = ".\frontend\src\components\auctionxi25d\dream\fielding\FieldingDirector.ts"
if (-not (Test-Path $fielding)) { throw "FieldingDirector.ts not found." }
$fieldingText = Get-Content $fielding -Raw
foreach ($needle in @("CATCH", "RUN_OUT", "BOUNDARY", "SPRINT", "DIVE", "PICKUP", "THROW")) {
    if ($fieldingText -notmatch [regex]::Escape($needle)) { throw "V4.7 fielding marker missing: $needle" }
}
Write-Host "PASS"

Write-Host "`n[3/6] Checking player movement offset contract..."
$rig = Get-Content ".\frontend\src\components\auctionxi25d\playerPresentation\v4\ProductionCricketPlayerRig.ts" -Raw
$playerDirector = Get-Content ".\frontend\src\components\auctionxi25d\dream\players\rig.ts" -Raw
foreach ($needle in @("offset:THREE.Vector3", "setPlayerPresentationOffset", "home.x+p.offset.x", "offset(id")) {
    if ($rig -notmatch [regex]::Escape($needle) -and $playerDirector -notmatch [regex]::Escape($needle)) { throw "Movement offset contract missing: $needle" }
}
Write-Host "PASS"

Write-Host "`n[4/6] Checking Dream presentation integration..."
$director = Get-Content ".\frontend\src\components\auctionxi25d\dream\presentation\director.ts" -Raw
foreach ($needle in @("FieldingDirector", "this.fielding.begin", "this.fielding.update", "this.fielding.reset")) {
    if ($director -notmatch [regex]::Escape($needle)) { throw "Fielding integration missing: $needle" }
}
Write-Host "PASS"

Write-Host "`n[5/6] Frontend production build..."
npm run build:frontend
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed." }
Write-Host "PASS"

Write-Host "`n[6/6] Backend test suite..."
npm run test:backend
if ($LASTEXITCODE -ne 0) { throw "Backend tests failed." }
Write-Host "PASS"

Write-Host "`nV4.7 verification complete." -ForegroundColor Green
