@echo off
title Auction XI — Autonomous Live Server
cd /d "%~dp0"
echo Starting Auction XI Autonomous Live Stack (Supabase + Spring Boot + Vite + Cloudflare)...
node scripts/start-live.mjs
pause
