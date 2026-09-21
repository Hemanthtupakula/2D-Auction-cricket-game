# Auction XI — Autonomous Live Server Launcher
Set-Location -Path $PSScriptRoot
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host " Starting Auction XI Autonomous Live Stack                   " -ForegroundColor Yellow
Write-Host " (Supabase + Spring Boot + Vite + Cloudflare Tunnel)         " -ForegroundColor Yellow
Write-Host "=============================================================" -ForegroundColor Cyan

node scripts/start-live.mjs
